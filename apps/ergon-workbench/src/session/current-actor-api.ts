import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  CurrentActor,
  CurrentActorClient,
  CurrentActorFailure,
} from './current-actor-client';

export interface WorkbenchDependencies {
  readonly currentActorClient: CurrentActorClient;
}

export interface CurrentActorQuery {
  readonly tenantId: string;
}

export const currentActorApi = createApi({
  reducerPath: 'currentActorApi',
  baseQuery: fakeBaseQuery<CurrentActorFailure>(),
  endpoints: (build) => ({
    currentActor: build.query<CurrentActor, CurrentActorQuery>({
      async queryFn({ tenantId }, queryApi) {
        const client = currentActorClientFrom(queryApi.extra);
        const result = await client.resolve(tenantId, queryApi.signal);
        return result.ok ? { data: result.actor } : { error: result.error };
      },
    }),
  }),
});

export const { useCurrentActorQuery } = currentActorApi;

function currentActorClientFrom(extra: unknown): CurrentActorClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'currentActorClient' in extra &&
    isCurrentActorClient(extra.currentActorClient)
  ) {
    return extra.currentActorClient;
  }
  throw new Error('Current actor client is not configured');
}

function isCurrentActorClient(value: unknown): value is CurrentActorClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resolve' in value &&
    typeof value.resolve === 'function'
  );
}
