import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  CurrentActorFailure,
  ResolveCurrentActor,
} from '@ergon/application-session';
import type { CurrentActor } from '@ergon/domain-session';

/** Tenant route context used as the current-actor cache key, not as authority. */
export interface CurrentActorQuery {
  readonly tenantId: string;
}

/**
 * Thunk-extra contract required by the current-actor cache adapter.
 *
 * The resolver is an executable dependency and must never be placed in Redux
 * state. Composition roots supply it when configuring the store.
 */
export interface CurrentActorCacheDependencies {
  readonly resolveCurrentActor: ResolveCurrentActor;
}

/**
 * Owns current-actor remote cache identity and request lifecycle.
 *
 * Cache entries are isolated by the complete tenant query. RTK Query owns
 * deduplication and passes cancellation to the injected application port; the
 * tenant key remains navigation context and never confers authority.
 */
export const currentActorApi = createApi({
  reducerPath: 'currentActorApi',
  baseQuery: fakeBaseQuery<CurrentActorFailure>(),
  endpoints: (build) => ({
    currentActor: build.query<CurrentActor, CurrentActorQuery>({
      async queryFn({ tenantId }, queryApi) {
        const resolver = currentActorResolverFrom(queryApi.extra);
        const result = await resolver.resolve(tenantId, queryApi.signal);
        return result.ok ? { data: result.actor } : { error: result.error };
      },
    }),
  }),
});

export const { useCurrentActorQuery } = currentActorApi;

function currentActorResolverFrom(extra: unknown): ResolveCurrentActor {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'resolveCurrentActor' in extra &&
    isCurrentActorResolver(extra.resolveCurrentActor)
  ) {
    return extra.resolveCurrentActor;
  }
  throw new Error('Current actor resolver is not configured');
}

function isCurrentActorResolver(value: unknown): value is ResolveCurrentActor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resolve' in value &&
    typeof value.resolve === 'function'
  );
}
