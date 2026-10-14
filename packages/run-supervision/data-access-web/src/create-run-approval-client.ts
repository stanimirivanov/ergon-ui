import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunApprovalClient,
  RunApprovalResult,
} from './approval-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readApprovalFailure } from './bff/run-approval-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeApprovalReceipt,
  isValidApprovalCommand,
} from './bff/run-approval-schemas';

/** Fresh CSRF plus one bounded POST/decode, no automatic retry. Replay uses unchanged intent with a new invocation-local token. */
export function createRunApprovalClient(
  options: RunSupervisionClientOptions,
): RunApprovalClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readApprovalFailure,
  );
  return {
    async decideApproval(command, signal): Promise<RunApprovalResult> {
      if (!isValidApprovalCommand(command))
        return { ok: false, error: { kind: 'invalid-approval' } };
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${command.tenantId}/resolution-runs/${command.runId}/approval-requests/${command.requestId}/decisions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body: JSON.stringify({
                commandId: command.commandId,
                expectedSupervisionRevision:
                  command.expectedSupervisionRevision,
                outcome: command.outcome,
              }),
            },
            (body) => decodeApprovalReceipt(body, command),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
