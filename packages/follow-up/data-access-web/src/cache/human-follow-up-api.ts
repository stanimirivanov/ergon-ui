import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
  HumanFollowUpReleaseCommand,
  HumanFollowUpReleaseFailure,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ReleaseHumanFollowUp,
  ResolverOwnedHumanFollowUpPage,
  ResolverOwnedHumanFollowUpQuery,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
} from '../client';
import type {
  HumanFollowUpClaim,
  HumanFollowUpRelease,
  ResolverFollowUpCaseSummary,
} from '@ergon/follow-up-model';

/**
 * Thunk-extra contract required by the follow-up cache adapter.
 *
 * These operations are executable dependencies and must never be placed in Redux
 * state. Composition roots supply them when configuring the store.
 */
export interface HumanFollowUpCacheDependencies {
  readonly listOpenHumanFollowUps: ListOpenHumanFollowUps;
  readonly listOwnedHumanFollowUps: ListOwnedHumanFollowUps;
  readonly getOwnedFollowUpCaseSummary: GetOwnedFollowUpCaseSummary;
  readonly claimHumanFollowUp: ClaimHumanFollowUp;
  readonly releaseHumanFollowUp: ReleaseHumanFollowUp;
}

/**
 * Owns follow-up server cache state for the resolver workbench.
 *
 * Query functions delegate to injected follow-up operations and forward RTK
 * Query's abort signal. Successful claims invalidate both visible and owned
 * work; stale claim outcomes invalidate only the visible inbox. Case evidence
 * cache identity includes the full requested tenant, work-item, case, and run
 * tuple. On fetch, the data-access boundary validates that same tuple before
 * a summary enters the cache.
 */
export const humanFollowUpApi = createApi({
  reducerPath: 'humanFollowUpApi',
  baseQuery: fakeBaseQuery<
    | HumanFollowUpFailure
    | HumanFollowUpClaimFailure
    | HumanFollowUpReleaseFailure
    | ResolverFollowUpCaseSummaryFailure
  >(),
  tagTypes: [
    'HumanFollowUpInbox',
    'ResolverOwnedHumanFollowUps',
    'ResolverFollowUpCaseSummary',
  ],
  endpoints: (build) => ({
    humanFollowUps: build.query<HumanFollowUpPage, HumanFollowUpQuery>({
      async queryFn(query, queryApi) {
        const capability = listOpenHumanFollowUpsFrom(queryApi.extra);
        const result = await capability.listOpen(query, queryApi.signal);
        return result.ok ? { data: result.page } : { error: result.error };
      },
      providesTags: (_result, _error, query) => [
        { type: 'HumanFollowUpInbox', id: query.tenantId },
      ],
    }),
    resolverOwnedHumanFollowUps: build.query<
      ResolverOwnedHumanFollowUpPage,
      ResolverOwnedHumanFollowUpQuery
    >({
      async queryFn(query, queryApi) {
        const capability = listOwnedHumanFollowUpsFrom(queryApi.extra);
        const result = await capability.listOwned(query, queryApi.signal);
        return result.ok ? { data: result.page } : { error: result.error };
      },
      providesTags: (_result, _error, query) => [
        { type: 'ResolverOwnedHumanFollowUps', id: query.tenantId },
      ],
    }),
    resolverFollowUpCaseSummary: build.query<
      ResolverFollowUpCaseSummary,
      ResolverFollowUpCaseSummaryQuery
    >({
      // Case evidence must not remain available after the last disclosure closes.
      keepUnusedDataFor: 0,
      async queryFn(query, queryApi) {
        const capability = getOwnedFollowUpCaseSummaryFrom(queryApi.extra);
        const result = await capability.getOwnedCaseSummary(
          query,
          queryApi.signal,
        );
        return result.ok ? { data: result.summary } : { error: result.error };
      },
      providesTags: (_result, _error, query) => [
        {
          type: 'ResolverFollowUpCaseSummary',
          id: `${query.tenantId}:${query.workItemId}`,
        },
      ],
    }),
    claimHumanFollowUp: build.mutation<
      HumanFollowUpClaim,
      HumanFollowUpClaimCommand
    >({
      async queryFn(command, queryApi) {
        const capability = claimHumanFollowUpFrom(queryApi.extra);
        const result = await capability.claim(command, queryApi.signal);
        return result.ok ? { data: result.claim } : { error: result.error };
      },
      invalidatesTags: (result, error, command) => {
        if (result !== undefined) {
          return [
            { type: 'HumanFollowUpInbox' as const, id: command.tenantId },
            {
              type: 'ResolverOwnedHumanFollowUps' as const,
              id: command.tenantId,
            },
          ];
        }
        return invalidatesStaleInbox(error)
          ? [{ type: 'HumanFollowUpInbox' as const, id: command.tenantId }]
          : [];
      },
    }),
    releaseHumanFollowUp: build.mutation<
      HumanFollowUpRelease,
      HumanFollowUpReleaseCommand
    >({
      async queryFn(command, queryApi) {
        const capability = releaseHumanFollowUpFrom(queryApi.extra);
        const result = await capability.release(command, queryApi.signal);
        return result.ok ? { data: result.release } : { error: result.error };
      },
      invalidatesTags: (result, error, command) => {
        if (result !== undefined) {
          return [
            { type: 'HumanFollowUpInbox' as const, id: command.tenantId },
            {
              type: 'ResolverOwnedHumanFollowUps' as const,
              id: command.tenantId,
            },
            {
              type: 'ResolverFollowUpCaseSummary' as const,
              id: `${command.tenantId}:${command.workItemId}`,
            },
          ];
        }
        return invalidatesStaleOwnedWork(error)
          ? [
              {
                type: 'ResolverOwnedHumanFollowUps' as const,
                id: command.tenantId,
              },
              {
                type: 'ResolverFollowUpCaseSummary' as const,
                id: `${command.tenantId}:${command.workItemId}`,
              },
            ]
          : [];
      },
    }),
  }),
});

export const {
  useClaimHumanFollowUpMutation,
  useHumanFollowUpsQuery,
  useReleaseHumanFollowUpMutation,
  useResolverFollowUpCaseSummaryQuery,
  useResolverOwnedHumanFollowUpsQuery,
} = humanFollowUpApi;

function listOpenHumanFollowUpsFrom(extra: unknown): ListOpenHumanFollowUps {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'listOpenHumanFollowUps' in extra &&
    isListOpenHumanFollowUps(extra.listOpenHumanFollowUps)
  ) {
    return extra.listOpenHumanFollowUps;
  }
  throw new Error('List-open follow-up capability is not configured');
}

function isListOpenHumanFollowUps(
  value: unknown,
): value is ListOpenHumanFollowUps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listOpen' in value &&
    typeof value.listOpen === 'function'
  );
}

function listOwnedHumanFollowUpsFrom(extra: unknown): ListOwnedHumanFollowUps {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'listOwnedHumanFollowUps' in extra &&
    isListOwnedHumanFollowUps(extra.listOwnedHumanFollowUps)
  ) {
    return extra.listOwnedHumanFollowUps;
  }
  throw new Error('List-owned follow-up capability is not configured');
}

function isListOwnedHumanFollowUps(
  value: unknown,
): value is ListOwnedHumanFollowUps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listOwned' in value &&
    typeof value.listOwned === 'function'
  );
}

function getOwnedFollowUpCaseSummaryFrom(
  extra: unknown,
): GetOwnedFollowUpCaseSummary {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'getOwnedFollowUpCaseSummary' in extra &&
    isGetOwnedFollowUpCaseSummary(extra.getOwnedFollowUpCaseSummary)
  ) {
    return extra.getOwnedFollowUpCaseSummary;
  }
  throw new Error('Owned follow-up case-summary capability is not configured');
}

function isGetOwnedFollowUpCaseSummary(
  value: unknown,
): value is GetOwnedFollowUpCaseSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    'getOwnedCaseSummary' in value &&
    typeof value.getOwnedCaseSummary === 'function'
  );
}

function claimHumanFollowUpFrom(extra: unknown): ClaimHumanFollowUp {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'claimHumanFollowUp' in extra &&
    isClaimHumanFollowUp(extra.claimHumanFollowUp)
  ) {
    return extra.claimHumanFollowUp;
  }
  throw new Error('Claim follow-up capability is not configured');
}

function isClaimHumanFollowUp(value: unknown): value is ClaimHumanFollowUp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'claim' in value &&
    typeof value.claim === 'function'
  );
}

function releaseHumanFollowUpFrom(extra: unknown): ReleaseHumanFollowUp {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'releaseHumanFollowUp' in extra &&
    isReleaseHumanFollowUp(extra.releaseHumanFollowUp)
  ) {
    return extra.releaseHumanFollowUp;
  }
  throw new Error('Release follow-up capability is not configured');
}

function isReleaseHumanFollowUp(value: unknown): value is ReleaseHumanFollowUp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'release' in value &&
    typeof value.release === 'function'
  );
}

function invalidatesStaleOwnedWork(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    (error.kind === 'not-found' || error.kind === 'ownership-revision-conflict')
  );
}

function invalidatesStaleInbox(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    (error.kind === 'already-claimed' ||
      error.kind === 'ownership-revision-conflict' ||
      error.kind === 'not-found')
  );
}
