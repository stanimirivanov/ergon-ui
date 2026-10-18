import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunCancellationClient,
  RunCancellationCommandResult,
  RunCancellationReviewResult,
} from './cancellation-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readCancellationFailure } from './bff/run-cancellation-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeCancellationCommand,
  decodeCancellationReceipt,
  decodeCancellationReview,
  isValidCancellationReviewQuery,
} from './bff/run-cancellation-schemas';

/** Fresh invocation-local CSRF and POST share one deadline; only reads may automatically retry. */
export function createRunCancellationClient(
  options: RunSupervisionClientOptions,
): RunCancellationClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readCancellationFailure,
  );
  return {
    async getCancellationReview(
      query,
      signal,
    ): Promise<RunCancellationReviewResult> {
      if (!isValidCancellationReviewQuery(query))
        return { ok: false, error: { kind: 'invalid-cancellation' } };
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/cancellation-review`,
          { method: 'GET' },
          decodeCancellationReview,
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, review: result.value } : result;
    },
    async cancelRun(command, signal): Promise<RunCancellationCommandResult> {
      const validated = decodeCancellationCommand(command);
      if (validated === undefined)
        return { ok: false, error: { kind: 'invalid-cancellation' } };
      const body = JSON.stringify({
        commandId: validated.commandId,
        expectedSupervisionRevision: validated.expectedSupervisionRevision,
        expectedRunVersion: validated.expectedRunVersion,
      });
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${validated.tenantId}/resolution-runs/${validated.runId}/cancellation-commands`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body,
            },
            (value) => decodeCancellationReceipt(value, validated),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
