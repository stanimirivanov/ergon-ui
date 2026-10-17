import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunRetryClient,
  RunRetryCommandResult,
  RunRetryReviewResult,
} from './retry-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readRetryFailure } from './bff/run-retry-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeRetryReceipt,
  decodeRetryReview,
  decodeRetryCommand,
  isValidRetryReviewQuery,
} from './bff/run-retry-schemas';

/** Reuses the bounded HTTP lifetime; review may retry once, while invocation-local CSRF and POST share one non-retried deadline. */
export function createRunRetryClient(
  options: RunSupervisionClientOptions,
): RunRetryClient {
  const { request, execute } = createRunCommandHttp(options, readRetryFailure);
  return {
    async getRetryReview(query, signal): Promise<RunRetryReviewResult> {
      if (!isValidRetryReviewQuery(query))
        return { ok: false, error: { kind: 'invalid-retry' } };
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/retry-review`,
          { method: 'GET' },
          decodeRetryReview,
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, review: result.value } : result;
    },
    async retryRun(command, signal): Promise<RunRetryCommandResult> {
      const validated = decodeRetryCommand(command);
      if (validated === undefined)
        return { ok: false, error: { kind: 'invalid-retry' } };
      const { tenantId, runId } = validated;
      // Construct the wire intent explicitly: local attribution coordinates and
      // caller extras must not become server-selected authority or payload.
      const body = {
        commandId: validated.commandId,
        expectedSupervisionRevision: validated.expectedSupervisionRevision,
        expectedRunVersion: validated.expectedRunVersion,
        retryPolicyRevision: validated.retryPolicyRevision,
        maximumAttempts: validated.maximumAttempts,
        plan: validated.plan,
      };
      const wireBody = JSON.stringify(body);
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${tenantId}/resolution-runs/${runId}/retry-commands`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body: wireBody,
            },
            (value) => decodeRetryReceipt(value, validated),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
