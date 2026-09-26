import type {
  GetOwnedFollowUpCaseSummary,
  HumanFollowUpQuery,
  HumanFollowUpResult,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ResolverFollowUpCaseSummaryQuery,
  ResolverFollowUpCaseSummaryResult,
  ResolverOwnedHumanFollowUpQuery,
  ResolverOwnedHumanFollowUpResult,
} from '@ergon/application-follow-up';
import { Effect, Either } from 'effect';

import {
  decodeHumanFollowUpPage,
  decodeResolverFollowUpCaseSummary,
  decodeResolverOwnedHumanFollowUpPage,
} from './follow-up-read-codecs';
import {
  isRetryableReadFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import { caseSummaryUrl, inboxUrl, ownedWorkUrl } from './follow-up-urls';

interface FollowUpReadAdapterOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout: number;
}

export function createFollowUpReadAdapter({
  fetch,
  requestTimeout,
}: FollowUpReadAdapterOptions): ListOpenHumanFollowUps &
  ListOwnedHumanFollowUps &
  GetOwnedFollowUpCaseSummary {
  return {
    async listOpen(query, signal) {
      const program = requestHumanFollowUps(fetch, query).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => TIMEOUT_FAILURE,
        }),
        Effect.retry({ times: 1, while: isRetryableReadFailure }),
      );

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        return Either.match(result, {
          onLeft: (error): HumanFollowUpResult => ({ ok: false, error }),
          onRight: (page): HumanFollowUpResult => ({ ok: true, page }),
        });
      } catch (cause) {
        if (!signal.aborted) {
          throw cause;
        }
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
    async listOwned(query, signal) {
      const program = requestResolverOwnedHumanFollowUps(fetch, query).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => TIMEOUT_FAILURE,
        }),
        Effect.retry({ times: 1, while: isRetryableReadFailure }),
      );

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        return Either.match(result, {
          onLeft: (error): ResolverOwnedHumanFollowUpResult => ({
            ok: false,
            error,
          }),
          onRight: (page): ResolverOwnedHumanFollowUpResult => ({
            ok: true,
            page,
          }),
        });
      } catch (cause) {
        if (!signal.aborted) {
          throw cause;
        }
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
    async getOwnedCaseSummary(query, signal) {
      const program = requestResolverFollowUpCaseSummary(fetch, query).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => TIMEOUT_FAILURE,
        }),
        Effect.retry({ times: 1, while: isRetryableReadFailure }),
      );

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        return Either.match(result, {
          onLeft: (error): ResolverFollowUpCaseSummaryResult => ({
            ok: false,
            error,
          }),
          onRight: (summary): ResolverFollowUpCaseSummaryResult => ({
            ok: true,
            summary,
          }),
        });
      } catch (cause) {
        if (!signal.aborted) {
          throw cause;
        }
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
  };
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
