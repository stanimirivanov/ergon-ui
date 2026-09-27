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
 * Owns current-actor remote cache state and bridges RTK Query cancellation to
 * the injected session client.
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
