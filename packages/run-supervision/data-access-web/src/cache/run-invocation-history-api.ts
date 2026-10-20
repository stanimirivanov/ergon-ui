import type {
  RunInvocationHistory,
  RunInvocationHistoryClient,
  RunInvocationHistoryQuery,
  RunInvocationHistoryFailure,
} from '../invocation-history-contracts';
import { normalizeExecutionHistoryFailure } from '../bff/run-execution-history-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Private RTK owner; complete tenant/run/epoch key, no grace retention, shared command invalidation. */
export const runInvocationHistoryApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getInvocationHistory: build.query<
      RunInvocationHistory,
      RunInvocationHistoryQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunInvocationHistory } | { error: RunInvocationHistoryFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!hasInvocationHistory(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.getInvocationHistory(query, api.signal);
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

function hasInvocationHistory(
  client: object,
): client is RunInvocationHistoryClient {
  return (
    'getInvocationHistory' in client &&
    typeof client.getInvocationHistory === 'function'
  );
}
