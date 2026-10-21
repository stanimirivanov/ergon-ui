import type {
  RunPinnedContract,
  RunPinnedContractClient,
  RunPinnedContractQuery,
  RunPinnedContractFailure,
} from '../pinned-contract-contracts';
import { normalizePinnedContractFailure } from '../bff/run-pinned-contract-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Private RTK owner; complete tenant/run/epoch key, no grace retention, shared command invalidation. */
export const runPinnedContractApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getPinnedContract: build.query<RunPinnedContract, RunPinnedContractQuery>({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunPinnedContract } | { error: RunPinnedContractFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!hasPinnedContract(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.getPinnedContract(query, api.signal);
          return result.ok
            ? { data: result.value }
            : { error: normalizePinnedContractFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

function hasPinnedContract(client: object): client is RunPinnedContractClient {
  return (
    'getPinnedContract' in client &&
    typeof client.getPinnedContract === 'function'
  );
}
