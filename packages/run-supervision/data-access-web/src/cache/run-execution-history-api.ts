import type {
  RunExecutionHistory,
  RunExecutionHistoryClient,
  RunExecutionHistoryQuery,
  RunExecutionHistoryFailure,
} from '../execution-history-contracts';
import { normalizeExecutionHistoryFailure } from '../bff/run-execution-history-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Private RTK owner; complete tenant/run/epoch key, no grace retention, shared command invalidation. */
export const runExecutionHistoryApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getExecutionHistory: build.query<
      RunExecutionHistory,
      RunExecutionHistoryQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunExecutionHistory } | { error: RunExecutionHistoryFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!hasHistory(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.getExecutionHistory(query, api.signal);
          return result.ok
            ? { data: result.value }
            : { error: normalizeExecutionHistoryFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

function hasHistory(client: object): client is RunExecutionHistoryClient {
  return (
    'getExecutionHistory' in client &&
    typeof client.getExecutionHistory === 'function'
  );
}
