import type { CurrentActor } from '@ergon/session-model';
import { Effect, Either } from 'effect';

import type {
  CurrentActorClient,
  CurrentActorFailure,
  CurrentActorResult,
} from '../current-actor-client';
import { decodeCurrentActorResponse } from './current-actor-codecs';
import {
  isRetryableCurrentActorFailure,
  mapAbortedTransportFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './current-actor-failures';

interface CurrentActorReadAdapterOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout: number;
}

/**
 * Creates the stateless current-actor read implementation.
 *
 * Each attempt receives the configured timeout. The idempotent read retries
 * one classified transient failure, honors caller interruption, and returns a
 * serializable typed outcome without exposing browser or Effect errors.
 */
export function createCurrentActorReadAdapter({
  fetch,
  requestTimeout,
}: CurrentActorReadAdapterOptions): CurrentActorClient {
  return {
    resolve: (tenantId, signal): Promise<CurrentActorResult> =>
      runCurrentActorRead(
        requestCurrentActor(fetch, tenantId),
        signal,
        requestTimeout,
      ),
  };
}

async function runCurrentActorRead(
  request: Effect.Effect<CurrentActor, CurrentActorFailure, never>,
  signal: AbortSignal,
  requestTimeout: number,
): Promise<CurrentActorResult> {
  const program = request.pipe(
    Effect.timeoutFail({
      duration: requestTimeout,
      onTimeout: () => TIMEOUT_FAILURE,
    }),
    Effect.retry({ times: 1, while: isRetryableCurrentActorFailure }),
  );

  try {
    const result = await Effect.runPromise(Effect.either(program), { signal });
    return Either.match(result, {
      onLeft: (error): CurrentActorResult => ({
        ok: false,
        error: mapAbortedTransportFailure(signal, error),
      }),
      onRight: (actor): CurrentActorResult => ({ ok: true, actor }),
    });
  } catch (cause) {
    if (!signal.aborted) {
      throw cause;
    }
    return { ok: false, error: REQUEST_CANCELLED };
  }
}

function requestCurrentActor(
  fetch: typeof globalThis.fetch,
  tenantId: string,
): Effect.Effect<CurrentActor, CurrentActorFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(currentActorSessionUrl(tenantId), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeCurrentActorResponse));
}

function currentActorSessionUrl(tenantId: string): string {
  return `/bff/v1/tenants/${encodeURIComponent(tenantId)}/session`;
}
