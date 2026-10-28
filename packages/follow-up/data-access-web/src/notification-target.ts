import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Effect, Either, Schema } from 'effect';
import {
  isResolverFollowUpCaseSummary,
  type ResolverFollowUpCaseSummary,
} from '@ergon/follow-up-model';
import type {
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryResult,
} from './client';
import { decodeResolverFollowUpCaseSummary } from './bff/follow-up-read-codecs';
import { resolverFollowUpCaseSummarySchema } from './bff/follow-up-wire-schemas';
import { runRead } from './bff/follow-up-read-adapter';
import { TRANSPORT_FAILURE } from './bff/follow-up-failures';
import { normalizeResolverFollowUpCaseSummaryFailure } from './client/normalize-human-follow-up-failures';

/** Work pointer is navigation only; actor scopes memory cache, not HTTP authority. */
export interface FollowUpNotificationTargetQuery {
  readonly tenantId: string;
  readonly actorId: string;
  readonly workItemId: string;
}
export interface FollowUpNotificationTargetClient {
  /** Current-owner BFF read, never a receipt. Complete model/work correlation is mandatory; defects can reject. */
  read(
    query: FollowUpNotificationTargetQuery,
    signal: AbortSignal,
  ): Promise<ResolverFollowUpCaseSummaryResult>;
}
/** Reuses reviewed read execution (5s per attempt, one classified retry) and decoder; owns bodies until settlement. */
export function createFollowUpNotificationTargetClient({
  fetch,
}: {
  readonly fetch: typeof globalThis.fetch;
}): FollowUpNotificationTargetClient {
  return {
    read: async (query, signal): Promise<ResolverFollowUpCaseSummaryResult> => {
      if (
        ![query.tenantId, query.actorId, query.workItemId].every((id) =>
          Schema.is(Schema.UUID)(id),
        )
      )
        return { ok: false, error: { kind: 'invalid-response' } };
      const owned = new AbortController();
      const request = Effect.tryPromise({
        try: (stageSignal) =>
          fetch(
            `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/case-summary`,
            {
              method: 'GET',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { Accept: 'application/json, application/problem+json' },
              signal: AbortSignal.any([stageSignal, owned.signal]),
            },
          ),
        catch: () => TRANSPORT_FAILURE,
      }).pipe(
        Effect.flatMap((response) =>
          decodeResolverFollowUpCaseSummary(response, query),
        ),
      );
      try {
        return await runRead(request, signal, 5000, (summary) => ({
          ok: true as const,
          summary,
        }));
      } finally {
        owned.abort();
      }
    },
  };
}
function isClient(value: unknown): value is FollowUpNotificationTargetClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'read' in value &&
    typeof value.read === 'function'
  );
}
/** Dedicated resource, never seeded from alerts or a queue's retained cache. Host owns scope disposal. */
export const followUpNotificationTargetApi = createApi({
  reducerPath: 'followUpNotificationTargetApi',
  baseQuery: fakeBaseQuery<ResolverFollowUpCaseSummaryFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (build) => ({
    current: build.query<
      ResolverFollowUpCaseSummary,
      FollowUpNotificationTargetQuery
    >({
      async queryFn(
        query,
        api,
      ): Promise<
        | { data: ResolverFollowUpCaseSummary }
        | { error: ResolverFollowUpCaseSummaryFailure }
      > {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('followUpNotificationTarget' in extra) ||
            !isClient(extra.followUpNotificationTarget)
          )
            return {
              error: normalizeResolverFollowUpCaseSummaryFailure(undefined),
            };
          const result = await extra.followUpNotificationTarget.read(
            query,
            api.signal,
          );
          if (!result.ok)
            return {
              error: normalizeResolverFollowUpCaseSummaryFailure(result.error),
            };
          const decoded = Schema.decodeUnknownEither(
            resolverFollowUpCaseSummarySchema,
          )(result.summary);
          return Either.isRight(decoded) &&
            isResolverFollowUpCaseSummary(decoded.right) &&
            decoded.right.followUp.workItemId === query.workItemId
            ? { data: decoded.right }
            : { error: { kind: 'invalid-response' } };
        } catch {
          return {
            error: normalizeResolverFollowUpCaseSummaryFailure(undefined),
          };
        }
      },
    }),
  }),
});
export { normalizeResolverFollowUpCaseSummaryFailure as normalizeNotificationTargetFailure };
