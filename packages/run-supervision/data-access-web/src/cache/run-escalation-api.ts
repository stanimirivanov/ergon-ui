import type { RunSupervisionClient } from '../contracts';
import type {
  RunEscalationClient,
  RunEscalationCommand,
  RunEscalationFailure,
  RunEscalationReceipt,
  RunEscalationReview,
  RunEscalationReviewQuery,
} from '../escalation-contracts';
import { normalizeRunEscalationFailure } from '../bff/run-escalation-http';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Same private RTK owner; every command outcome invalidates observations because missing acknowledgement does not prove rollback. */
export const runEscalationApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRunEscalationReview: build.query<
      RunEscalationReview,
      RunEscalationReviewQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunEscalationReview } | { error: RunEscalationFailure }
      > {
        try {
          const result = await escalationClient(api.extra).getEscalationReview(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.review }
            : { error: normalizeRunEscalationFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    escalateExhaustedRun: build.mutation<
      RunEscalationReceipt,
      RunEscalationCommand
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
        { data: RunEscalationReceipt } | { error: RunEscalationFailure }
      > {
        try {
          const result = await escalationClient(api.extra).escalateRun(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunEscalationFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
export const { useEscalateExhaustedRunMutation } = runEscalationApi;

function escalationClient(extra: unknown): RunEscalationClient {
  const client = clientFrom(extra);
  if (isEscalationClient(client)) return client;
  throw new Error('Run escalation client is not configured');
}
function isEscalationClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunEscalationClient {
  return (
    'getEscalationReview' in client &&
    typeof client.getEscalationReview === 'function' &&
    'escalateRun' in client &&
    typeof client.escalateRun === 'function'
  );
}
