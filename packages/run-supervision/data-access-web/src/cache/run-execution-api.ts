import type { RunSupervisionClient } from '../contracts';
import type {
  RunExecutionClient,
  RunExecutionCommand,
  RunExecutionFailure,
  RunExecutionReceipt,
  RunExecutionReview,
  RunExecutionReviewQuery,
} from '../execution-command-contracts';
import { normalizeRunExecutionFailure } from '../bff/run-execution-command-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Execution resources share the existing reducer/lifetime. Defects and private error extras cannot reach RTK serialization/logging. */
export const runExecutionApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRunExecutionReview: build.query<
      RunExecutionReview,
      RunExecutionReviewQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunExecutionReview } | { error: RunExecutionFailure }
      > {
        try {
          const result = await executionClient(api.extra).getExecutionReview(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.review }
            : { error: normalizeRunExecutionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    submitRunExecution: build.mutation<
      RunExecutionReceipt,
      RunExecutionCommand
    >({
      // Even an unavailable acknowledgement may follow a committed effect.
      // Other subscribers must establish fresh truth, not retain stale eligibility.
      invalidatesTags: (_result, _error, command) => [
        { type: 'AssignedRuns', id: command.tenantId },
        { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
        { type: 'RunCandidates', id: `${command.tenantId}:${command.runId}` },
      ],
      async queryFn(
        command,
        api,
      ): Promise<
        { data: RunExecutionReceipt } | { error: RunExecutionFailure }
      > {
        try {
          const result = await executionClient(api.extra).submitExecution(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunExecutionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

export const { useSubmitRunExecutionMutation } = runExecutionApi;

function executionClient(extra: unknown): RunExecutionClient {
  const client = clientFrom(extra);
  if (isExecutionClient(client)) return client;
  throw new Error('Run execution client is not configured');
}

function isExecutionClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunExecutionClient {
  return (
    'getExecutionReview' in client &&
    typeof client.getExecutionReview === 'function' &&
    'submitExecution' in client &&
    typeof client.submitExecution === 'function'
  );
}
