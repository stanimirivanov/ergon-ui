import type {
  GetOwnedFollowUpCaseSummary,
  HumanFollowUpFailure,
  HumanFollowUpQuery,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
  ResolverOwnedHumanFollowUpQuery,
} from '@ergon/application-follow-up';
import { Effect, Either } from 'effect';

import {
  decodeHumanFollowUpPage,
  decodeResolverFollowUpCaseSummary,
  decodeResolverOwnedHumanFollowUpPage,
} from './follow-up-read-codecs';
import {
  isRetryableReadFailure,
  mapAbortedTransportFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import { caseSummaryUrl, inboxUrl, ownedWorkUrl } from './follow-up-urls';

interface FollowUpReadAdapterOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout: number;
}

type FollowUpReadFailure =
  HumanFollowUpFailure | ResolverFollowUpCaseSummaryFailure;
type ReadExecutionFailure = typeof REQUEST_CANCELLED | typeof TIMEOUT_FAILURE;

interface FailedRead<Failure extends FollowUpReadFailure> {
  readonly ok: false;
  readonly error: Failure | ReadExecutionFailure;
}

export function createFollowUpReadAdapter({
  fetch,
  requestTimeout,
}: FollowUpReadAdapterOptions): ListOpenHumanFollowUps &
  ListOwnedHumanFollowUps &
  GetOwnedFollowUpCaseSummary {
  return {
    listOpen: (query, signal) =>
      runRead(
        requestHumanFollowUps(fetch, query),
        signal,
        requestTimeout,
        (page) => ({ ok: true as const, page }),
      ),
    listOwned: (query, signal) =>
      runRead(
        requestResolverOwnedHumanFollowUps(fetch, query),
        signal,
        requestTimeout,
        (page) => ({ ok: true as const, page }),
      ),
    getOwnedCaseSummary: (query, signal) =>
      runRead(
        requestResolverFollowUpCaseSummary(fetch, query),
        signal,
        requestTimeout,
        (summary) => ({ ok: true as const, summary }),
      ),
  };
}

async function runRead<Value, Failure extends FollowUpReadFailure, Success>(
  request: Effect.Effect<Value, Failure>,
  signal: AbortSignal,
  requestTimeout: number,
  onSuccess: (value: Value) => Success,
): Promise<Success | FailedRead<Failure>> {
  const program = request.pipe(
    Effect.timeoutFail({
      duration: requestTimeout,
      onTimeout: () => TIMEOUT_FAILURE,
    }),
    Effect.retry({ times: 1, while: isRetryableReadFailure }),
  );

  try {
    const result = await Effect.runPromise(Effect.either(program), { signal });
    return Either.match(result, {
      onLeft: (error) => ({
        ok: false as const,
        error: mapAbortedTransportFailure(signal, error),
      }),
      onRight: onSuccess,
    });
  } catch (cause) {
    if (!signal.aborted) {
      throw cause;
    }
    return { ok: false, error: REQUEST_CANCELLED };
  }
}

function requestHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: HumanFollowUpQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(inboxUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeHumanFollowUpPage));
}

function requestResolverOwnedHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: ResolverOwnedHumanFollowUpQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(ownedWorkUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeResolverOwnedHumanFollowUpPage));
}

function requestResolverFollowUpCaseSummary(
  fetch: typeof globalThis.fetch,
  query: ResolverFollowUpCaseSummaryQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(caseSummaryUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(
    Effect.flatMap((response) =>
      decodeResolverFollowUpCaseSummary(response, query),
    ),
  );
}
