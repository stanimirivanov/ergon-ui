import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunEscalationClient,
  RunEscalationCommandResult,
  RunEscalationReviewResult,
} from './escalation-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readEscalationFailure } from './bff/run-escalation-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeEscalationCommand,
  decodeEscalationReceipt,
  decodeEscalationReview,
  isValidEscalationReviewQuery,
} from './bff/run-escalation-schemas';

/** Review retries only transient reads; fresh invocation-local CSRF and POST share one non-retried deadline. */
export function createRunEscalationClient(
  options: RunSupervisionClientOptions,
): RunEscalationClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readEscalationFailure,
  );
  return {
    async getEscalationReview(
      query,
      signal,
    ): Promise<RunEscalationReviewResult> {
      if (!isValidEscalationReviewQuery(query))
        return { ok: false, error: { kind: 'invalid-escalation' } };
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/escalation-review`,
          { method: 'GET' },
          decodeEscalationReview,
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, review: result.value } : result;
    },
    async escalateRun(command, signal): Promise<RunEscalationCommandResult> {
      const validated = decodeEscalationCommand(command);
      if (validated === undefined)
        return { ok: false, error: { kind: 'invalid-escalation' } };
      // Queue, actor and time are server-owned; caller extras cannot cross this boundary.
      const body = JSON.stringify({
        ...(validated.control === undefined
          ? {}
          : { control: validated.control }),
        commandId: validated.commandId,
        expectedSupervisionRevision: validated.expectedSupervisionRevision,
        expectedRunVersion: validated.expectedRunVersion,
        sourceAttemptNumber: validated.sourceAttemptNumber,
        retryPolicyRevision: validated.retryPolicyRevision,
        maximumAttempts: validated.maximumAttempts,
        reason: validated.reason,
      });
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${validated.tenantId}/resolution-runs/${validated.runId}/escalation-commands`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body,
            },
            (value) => decodeEscalationReceipt(value, validated),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
