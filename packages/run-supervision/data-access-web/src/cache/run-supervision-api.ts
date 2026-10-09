import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  AssignedRunConsole,
  AssignedRunConsoleQuery,
  AssignedRunPage,
  AssignedRunQuery,
  RunSupervisionClient,
  RunSupervisionFailure,
} from '../contracts';

/** Executable thunk-extra binding supplied by the app; never put the client in Redux state. */
export interface RunSupervisionDependencies {
  readonly runSupervision: RunSupervisionClient;
}

/**
 * Remote read cache keyed by the complete tenant/query or tenant/run identity.
 *
 * Both projections are evicted after their final subscriber leaves; reopening
 * must revalidate current server assignment/authority rather than revive a
 * retained private snapshot. RTK cancellation reaches the injected client.
 * Register this reducer and middleware in the store and supply its dependencies.
 */
export const runSupervisionApi = createApi({
  reducerPath: 'runSupervisionApi',
  baseQuery: fakeBaseQuery<RunSupervisionFailure>(),
  endpoints: (build) => ({
    listAssignedRuns: build.query<AssignedRunPage, AssignedRunQuery>({
      keepUnusedDataFor: 0,
      async queryFn(
        query,
        api,
      ): Promise<{ data: AssignedRunPage } | { error: RunSupervisionFailure }> {
        const result = await clientFrom(api.extra).listAssigned(
          query,
          api.signal,
        );
        return result.ok ? { data: result.page } : { error: result.error };
      },
    }),
    getAssignedRunConsole: build.query<
      AssignedRunConsole,
      AssignedRunConsoleQuery
    >({
      keepUnusedDataFor: 0,
      async queryFn(
        query,
        api,
      ): Promise<
        { data: AssignedRunConsole } | { error: RunSupervisionFailure }
      > {
        const result = await clientFrom(api.extra).getConsole(
          query,
          api.signal,
        );
        return result.ok ? { data: result.console } : { error: result.error };
      },
    }),
  }),
});

export const {
  useListAssignedRunsQuery,
  useLazyListAssignedRunsQuery,
  useGetAssignedRunConsoleQuery,
  useLazyGetAssignedRunConsoleQuery,
} = runSupervisionApi;

function clientFrom(extra: unknown): RunSupervisionClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'runSupervision' in extra
  ) {
    const candidate = extra.runSupervision;
    if (isClient(candidate)) return candidate;
  }
  throw new Error('Run supervision client is not configured');
}

function isClient(value: unknown): value is RunSupervisionClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listAssigned' in value &&
    typeof value.listAssigned === 'function' &&
    'getConsole' in value &&
    typeof value.getConsole === 'function'
  );
}
