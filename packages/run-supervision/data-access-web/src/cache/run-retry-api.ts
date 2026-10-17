import type { RunSupervisionClient } from '../contracts';
import type {
  RunRetryClient,
  RunRetryCommand,
  RunRetryFailure,
  RunRetryReceipt,
  RunRetryReview,
  RunRetryReviewQuery,
} from '../retry-contracts';
import { normalizeRunRetryFailure } from '../bff/run-retry-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Same private RTK resource owner. Every command result invalidates observations because a lost acknowledgement may follow a committed retry. */
export const runRetryApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRunRetryReview: build.query<RunRetryReview, RunRetryReviewQuery>({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<{ data: RunRetryReview } | { error: RunRetryFailure }> {
        try {
          const result = await retryClient(api.extra).getRetryReview(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.review }
            : { error: normalizeRunRetryFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    retryFailedRun: build.mutation<RunRetryReceipt, RunRetryCommand>({
      invalidatesTags: (_result, _error, command) => [
        { type: 'AssignedRuns', id: command.tenantId },
        { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
        { type: 'RunCandidates', id: `${command.tenantId}:${command.runId}` },
      ],
      async queryFn(
        command,
        api,
      ): Promise<{ data: RunRetryReceipt } | { error: RunRetryFailure }> {
        try {
          const result = await retryClient(api.extra).retryRun(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunRetryFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
export const { useRetryFailedRunMutation } = runRetryApi;

function retryClient(extra: unknown): RunRetryClient {
  const client = clientFrom(extra);
  if (isRetryClient(client)) return client;
  throw new Error('Run retry client is not configured');
}
function isRetryClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunRetryClient {
  return (
    'getRetryReview' in client &&
    typeof client.getRetryReview === 'function' &&
    'retryRun' in client &&
    typeof client.retryRun === 'function'
  );
}
