import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  HumanFollowUpClient,
  HumanFollowUpFailure,
  HumanFollowUpPage,
  HumanFollowUpQuery,
} from './human-follow-up-client';

export const humanFollowUpApi = createApi({
  reducerPath: 'humanFollowUpApi',
  baseQuery: fakeBaseQuery<HumanFollowUpFailure>(),
  endpoints: (build) => ({
    humanFollowUps: build.query<HumanFollowUpPage, HumanFollowUpQuery>({
      async queryFn(query, queryApi) {
        const client = humanFollowUpClientFrom(queryApi.extra);
        const result = await client.listOpen(query, queryApi.signal);
        return result.ok ? { data: result.page } : { error: result.error };
      },
    }),
  }),
});

export const { useHumanFollowUpsQuery } = humanFollowUpApi;

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
    typeof value.listOpen === 'function'
  );
}
