import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type { CurrentActor } from '@ergon/session-model';

import type {
  CurrentActorClient,
  CurrentActorFailure,
} from '../current-actor-client';

/** Tenant route context used as the current-actor cache key, not as authority. */
export interface CurrentActorQuery {
  readonly tenantId: string;
}

/**
 * Thunk-extra contract required by the current-actor cache adapter.
 *
 * The current-actor client is an executable dependency and must never be
 * placed in Redux state. Composition roots supply it when configuring the
 * store.
 */
export interface CurrentActorCacheDependencies {
  readonly resolveCurrentActor: CurrentActorClient;
}

/**
 * Owns current-actor remote cache identity and request lifecycle.
 *
 * Cache entries are isolated by the complete tenant query. RTK Query owns
 * deduplication and passes cancellation to the injected current-actor client;
 * the tenant key remains navigation context and never confers authority.
 */
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
    'resolveCurrentActor' in extra &&
    isCurrentActorClient(extra.resolveCurrentActor)
  ) {
    return extra.resolveCurrentActor;
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
