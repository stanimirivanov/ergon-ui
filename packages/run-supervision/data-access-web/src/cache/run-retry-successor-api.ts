import type {
  RunRetrySuccessor,
  RunRetrySuccessorClient,
  RunRetrySuccessorQuery,
  RunRetrySuccessorFailure,
} from '../retry-successor-contracts';
import { normalizeRetrySuccessorFailure } from '../bff/run-retry-successor-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** One private RTK observation per exact tenant/source/epoch, evicted after its last reader and invalidated with source commands. */
export const runRetrySuccessorApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRetrySuccessor: build.query<RunRetrySuccessor, RunRetrySuccessorQuery>({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunRetrySuccessor } | { error: RunRetrySuccessorFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!hasSuccessorRead(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.getRetrySuccessor(query, api.signal);
          return result.ok
            ? { data: result.value }
            : { error: normalizeRetrySuccessorFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

function hasSuccessorRead(client: object): client is RunRetrySuccessorClient {
  return (
    'getRetrySuccessor' in client &&
    typeof client.getRetrySuccessor === 'function'
  );
}
