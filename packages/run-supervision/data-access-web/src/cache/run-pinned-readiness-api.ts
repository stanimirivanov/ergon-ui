import type {
  RunPinnedReadiness,
  RunPinnedReadinessClient,
  RunPinnedReadinessQuery,
  RunPinnedReadinessFailure,
} from '../pinned-readiness-contracts';
import { normalizeInspectionFailure } from '../bff/run-inspection-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Private exact-pin RTK owner; zero-grace eviction and existing command invalidation, not a second cache or authority snapshot. */
export const runPinnedReadinessApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getPinnedReadiness: build.query<
      RunPinnedReadiness,
      RunPinnedReadinessQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunPinnedReadiness } | { error: RunPinnedReadinessFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!hasPinnedReadiness(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.getPinnedReadiness(query, api.signal);
          return result.ok
            ? { data: result.value }
            : {
                error: normalizeInspectionFailure(
                  result.error,
                  'readiness-unsupported',
                ),
              };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

function hasPinnedReadiness(
  client: object,
): client is RunPinnedReadinessClient {
  return (
    'getPinnedReadiness' in client &&
    typeof client.getPinnedReadiness === 'function'
  );
}
