import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  HumanFollowUpClaim,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClient,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
} from './human-follow-up-client';

export const humanFollowUpApi = createApi({
  reducerPath: 'humanFollowUpApi',
  baseQuery: fakeBaseQuery<HumanFollowUpFailure | HumanFollowUpClaimFailure>(),
  tagTypes: ['HumanFollowUpInbox'],
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
    claimHumanFollowUp: build.mutation<
      HumanFollowUpClaim,
      HumanFollowUpClaimCommand
    >({
      async queryFn(command, queryApi) {
        const client = humanFollowUpClientFrom(queryApi.extra);
        const result = await client.claim(command, queryApi.signal);
        return result.ok ? { data: result.claim } : { error: result.error };
      },
      invalidatesTags: (result, error, command) =>
        result !== undefined || invalidatesStaleInbox(error)
          ? [{ type: 'HumanFollowUpInbox', id: command.tenantId }]
          : [],
    }),
  }),
});

export const { useClaimHumanFollowUpMutation, useHumanFollowUpsQuery } =
  humanFollowUpApi;

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
    'claim' in value &&
    typeof value.claim === 'function'
  );
}

function invalidatesStaleInbox(
  error: HumanFollowUpFailure | HumanFollowUpClaimFailure | undefined,
): boolean {
  return error?.kind === 'already-claimed' || error?.kind === 'not-found';
}
