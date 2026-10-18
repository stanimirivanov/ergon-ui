import type { RunSupervisionClient } from '../contracts';
import type {
  RunCancellationClient,
  RunCancellationCommand,
  RunCancellationFailure,
  RunCancellationReceipt,
  RunCancellationReview,
  RunCancellationReviewQuery,
} from '../cancellation-contracts';
import { normalizeRunCancellationFailure } from '../bff/run-cancellation-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Same private RTK owner; every command outcome invalidates observations because missing acknowledgement does not prove rollback. */
export const runCancellationApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRunCancellationReview: build.query<
      RunCancellationReview,
      RunCancellationReviewQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunCancellationReview } | { error: RunCancellationFailure }
      > {
        try {
          const result = await cancellationClient(
            api.extra,
          ).getCancellationReview(query, api.signal);
          return result.ok
            ? { data: result.review }
            : { error: normalizeRunCancellationFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    cancelUntouchedRun: build.mutation<
      RunCancellationReceipt,
      RunCancellationCommand
    >({
      invalidatesTags: (_result, _error, command) => [
        { type: 'AssignedRuns', id: command.tenantId },
        { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
        { type: 'RunCandidates', id: `${command.tenantId}:${command.runId}` },
      ],
      async queryFn(
        command,
        api,
      ): Promise<
        { data: RunCancellationReceipt } | { error: RunCancellationFailure }
      > {
        try {
          const result = await cancellationClient(api.extra).cancelRun(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunCancellationFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
export const { useCancelUntouchedRunMutation } = runCancellationApi;

function cancellationClient(extra: unknown): RunCancellationClient {
  const client = clientFrom(extra);
  if (isCancellationClient(client)) return client;
  throw new Error('Run cancellation client is not configured');
}
function isCancellationClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunCancellationClient {
  return (
    'getCancellationReview' in client &&
    typeof client.getCancellationReview === 'function' &&
    'cancelRun' in client &&
    typeof client.cancelRun === 'function'
  );
}
