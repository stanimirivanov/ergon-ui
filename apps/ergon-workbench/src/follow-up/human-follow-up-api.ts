import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ResolverOwnedHumanFollowUpPage,
  ResolverOwnedHumanFollowUpQuery,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
} from '@ergon/application-follow-up';
import type {
  HumanFollowUpClaim,
  ResolverFollowUpCaseSummary,
} from '@ergon/domain-follow-up';

export const humanFollowUpApi = createApi({
  reducerPath: 'humanFollowUpApi',
  baseQuery: fakeBaseQuery<
    | HumanFollowUpFailure
    | HumanFollowUpClaimFailure
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
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}:${queryArgs.tenantId}:${queryArgs.workItemId}`,
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
  }),
});

export const {
  useClaimHumanFollowUpMutation,
  useHumanFollowUpsQuery,
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

function invalidatesStaleInbox(
  error: HumanFollowUpFailure | HumanFollowUpClaimFailure | undefined,
): boolean {
  return error?.kind === 'already-claimed' || error?.kind === 'not-found';
}
