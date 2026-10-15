import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunProofFinalizationClient,
  RunProofFinalizationResult,
} from './proof-finalization-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readProofFailure } from './bff/run-proof-finalization-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeProofReceipt,
  isValidProofCommand,
} from './bff/run-proof-finalization-schemas';

/** Fresh invocation-local CSRF plus exact reviewed proof intent; no automatic mutation retry. */
export function createRunProofFinalizationClient(
  options: RunSupervisionClientOptions,
): RunProofFinalizationClient {
  const { request, execute } = createRunCommandHttp(options, readProofFailure);
  return {
    async finalizeProof(command, signal): Promise<RunProofFinalizationResult> {
      if (!isValidProofCommand(command))
        return { ok: false, error: { kind: 'invalid-proof-finalization' } };
      const { tenantId, runId, ...body } = command;
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${tenantId}/resolution-runs/${runId}/proof-finalizations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body: JSON.stringify(body),
            },
            (value) => decodeProofReceipt(value, command),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
