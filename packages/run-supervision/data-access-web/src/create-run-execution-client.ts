import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunExecutionClient,
  RunExecutionCommandResult,
  RunExecutionReviewResult,
} from './execution-command-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readExecutionFailure } from './bff/run-execution-command-http';
import {
  decodeExecutionReceipt,
  decodeExecutionReview,
  isValidExecutionCommand,
  isValidExecutionReviewQuery,
} from './bff/run-execution-command-schemas';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';

/** One bounded invocation; no automatic dispatch/replay retry. A 202 is valid non-terminal feedback, not a failed HTTP call. */
export function createRunExecutionClient(
  options: RunSupervisionClientOptions,
): RunExecutionClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readExecutionFailure,
  );
  return {
    async getExecutionReview(query, signal): Promise<RunExecutionReviewResult> {
      if (!isValidExecutionReviewQuery(query))
        return { ok: false, error: { kind: 'invalid-execution' } };
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/execution-review`,
          { method: 'GET' },
          decodeExecutionReview,
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, review: result.value } : result;
    },
    async submitExecution(command, signal): Promise<RunExecutionCommandResult> {
      if (!isValidExecutionCommand(command))
        return { ok: false, error: { kind: 'invalid-execution' } };
      const base = `/bff/v1/tenants/${command.tenantId}/resolution-runs/${command.runId}/execution-commands`;
      const url =
        command.kind === 'execute'
          ? base
          : `${base}/${command.commandId}/attempts`;
      const revisions = {
        expectedSupervisionRevision: command.expectedSupervisionRevision,
        expectedRunVersion: command.expectedRunVersion,
      };
      const body =
        command.kind === 'execute'
          ? {
              ...revisions,
              commandId: command.commandId,
              requestId: command.requestId,
              decisionId: command.decisionId,
            }
          : { ...revisions, attemptId: command.attemptId };
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeRunSessionCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body: JSON.stringify(body),
            },
            (value, status) => decodeExecutionReceipt(value, command, status),
            signal,
            [200, 202],
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };
}
