import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunSupervisorCandidateResult,
  RunSupervisorHandoverClient,
  RunSupervisorHandoverResult,
} from './handover-contracts';
import { readHandoverFailure } from './bff/run-handover-http';
import { createRunCommandHttp } from './bff/run-command-http';
import {
  decodeCandidatePage,
  decodeHandoverReceipt,
  isValidCandidateQuery,
  isValidHandoverCommand,
} from './bff/run-handover-schemas';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';

/**
 * Session-CSRF transfer and current-epoch recipient reads. One command deadline
 * covers setup/POST/decoding without automatic retry. Tokens are invocation-local;
 * cancellation/malformed POST results remain uncertain. Candidate reads retry one
 * classified transient failure. Shared transport owns physical body cancellation.
 */
export function createRunHandoverClient(
  options: RunSupervisionClientOptions,
): RunSupervisorHandoverClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readHandoverFailure,
  );
  return {
    async listHandoverCandidates(
      query,
      signal,
    ): Promise<RunSupervisorCandidateResult> {
      if (!isValidCandidateQuery(query))
        return { ok: false, error: { kind: 'invalid-handover' } };
      const params = new URLSearchParams({
        expectedSupervisionRevision: String(query.expectedSupervisionRevision),
        limit: String(query.limit ?? 25),
      });
      if (query.afterActorId !== undefined)
        params.set('afterActorId', query.afterActorId);
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/handover-candidates?${params}`,
          { method: 'GET' },
          (body) => decodeCandidatePage(body, query),
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, page: result.value } : result;
    },
    async handoverSupervisor(
      command,
      signal,
    ): Promise<RunSupervisorHandoverResult> {
      if (!isValidHandoverCommand(command))
        return { ok: false, error: { kind: 'invalid-handover' } };
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${command.tenantId}/resolution-runs/${command.runId}/supervisor-handovers`,
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
                supervisorActorId: command.supervisorActorId,
              }),
            },
            (body) => decodeHandoverReceipt(body, command),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
