import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  HumanFollowUpClaim,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClient,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
  ResolverOwnedHumanFollowUpPage,
  ResolverOwnedHumanFollowUpQuery,
} from './human-follow-up-client';

export const humanFollowUpApi = createApi({
  reducerPath: 'humanFollowUpApi',
  baseQuery: fakeBaseQuery<HumanFollowUpFailure | HumanFollowUpClaimFailure>(),
  tagTypes: ['HumanFollowUpInbox', 'ResolverOwnedHumanFollowUps'],
  endpoints: (build) => ({
    humanFollowUps: build.query<HumanFollowUpPage, HumanFollowUpQuery>({
      async queryFn(query, queryApi) {
        const client = humanFollowUpClientFrom(queryApi.extra);
        const result = await client.listOpen(query, queryApi.signal);
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
        const client = humanFollowUpClientFrom(queryApi.extra);
        const result = await client.listOwned(query, queryApi.signal);
        return result.ok ? { data: result.page } : { error: result.error };
      },
      providesTags: (_result, _error, query) => [
        { type: 'ResolverOwnedHumanFollowUps', id: query.tenantId },
      ],
    }),
    claimHumanFollowUp: build.mutation<
      HumanFollowUpClaim,
      HumanFollowUpClaimCommand
    >({
      async queryFn(command, queryApi) {
        const client = humanFollowUpClientFrom(queryApi.extra);
        const result = await client.claim(command, queryApi.signal);
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
  useResolverOwnedHumanFollowUpsQuery,
} = humanFollowUpApi;

function humanFollowUpClientFrom(extra: unknown): HumanFollowUpClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'humanFollowUpClient' in extra &&
    isHumanFollowUpClient(extra.humanFollowUpClient)
  ) {
    return extra.humanFollowUpClient;
  }
  throw new Error('Human follow-up client is not configured');
}

function isHumanFollowUpClient(value: unknown): value is HumanFollowUpClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listOpen' in value &&
    typeof value.listOpen === 'function' &&
    'listOwned' in value &&
    typeof value.listOwned === 'function' &&
    'claim' in value &&
    typeof value.claim === 'function'
  );
}

function invalidatesStaleInbox(
  error: HumanFollowUpFailure | HumanFollowUpClaimFailure | undefined,
): boolean {
  return error?.kind === 'already-claimed' || error?.kind === 'not-found';
}
