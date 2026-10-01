import type {
  GetOwnedFollowUpCaseSummary,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
  HumanFollowUpResult,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
  ResolverFollowUpCaseSummaryResult,
  ResolverOwnedHumanFollowUpPage,
  ResolverOwnedHumanFollowUpQuery,
  ResolverOwnedHumanFollowUpResult,
} from '../client';
import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
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
  /** Fetch-compatible transport for same-origin credentialed requests. */
  readonly fetch: typeof globalThis.fetch;
  /** Positive timeout in milliseconds applied to each read attempt. */
  readonly requestTimeout: number;
}

type FollowUpReadAdapter = ListOpenHumanFollowUps &
  ListOwnedHumanFollowUps &
  GetOwnedFollowUpCaseSummary;
type FollowUpReadFailure =
  HumanFollowUpFailure | ResolverFollowUpCaseSummaryFailure;
type ReadExecutionFailure = typeof REQUEST_CANCELLED | typeof TIMEOUT_FAILURE;

interface FailedRead<Failure extends FollowUpReadFailure> {
  readonly ok: false;
  readonly error: Failure | ReadExecutionFailure;
}

/**
 * Creates the read-only BFF operations.
 *
 * Every read receives the same per-attempt timeout, one retry for classified
 * transient failures, Effect interruption from the caller's signal, and
 * cancellation normalization.
 */
export function createFollowUpReadAdapter({
  fetch,
  requestTimeout,
}: FollowUpReadAdapterOptions): FollowUpReadAdapter {
  return {
    listOpen: (query, signal): Promise<HumanFollowUpResult> =>
      runRead(
        requestHumanFollowUps(fetch, query),
        signal,
        requestTimeout,
        (page) => ({ ok: true as const, page }),
      ),
    listOwned: (query, signal): Promise<ResolverOwnedHumanFollowUpResult> =>
      runRead(
        requestResolverOwnedHumanFollowUps(fetch, query),
        signal,
        requestTimeout,
        (page) => ({ ok: true as const, page }),
      ),
    getOwnedCaseSummary: (
      query,
      signal,
    ): Promise<ResolverFollowUpCaseSummaryResult> =>
      runRead(
        requestResolverFollowUpCaseSummary(fetch, query),
        signal,
        requestTimeout,
        (summary) => ({ ok: true as const, summary }),
      ),
  };
}

/**
 * Executes the policy shared by idempotent BFF reads while preserving each
 * operation's success shape and typed failure channel.
 */
async function runRead<Value, Failure extends FollowUpReadFailure, Success>(
  request: Effect.Effect<Value, Failure, never>,
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

/** Constructs the interruptible visible-work request and decoding pipeline. */
function requestHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: HumanFollowUpQuery,
): Effect.Effect<HumanFollowUpPage, HumanFollowUpFailure, never> {
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

/** Constructs the interruptible resolver-owned-work request and decoding pipeline. */
function requestResolverOwnedHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: ResolverOwnedHumanFollowUpQuery,
): Effect.Effect<ResolverOwnedHumanFollowUpPage, HumanFollowUpFailure, never> {
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

/**
 * Constructs the interruptible case-context request; decoding binds the
 * response back to the complete requested identity.
 */
function requestResolverFollowUpCaseSummary(
  fetch: typeof globalThis.fetch,
  query: ResolverFollowUpCaseSummaryQuery,
): Effect.Effect<
  ResolverFollowUpCaseSummary,
  ResolverFollowUpCaseSummaryFailure,
  never
> {
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
