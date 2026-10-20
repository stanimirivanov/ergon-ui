import type {
  RunExecutionHistoryClient,
  RunExecutionHistoryResult,
} from './execution-history-contracts';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import { createRunCommandHttp } from './bff/run-command-http';
import { readExecutionHistoryFailure } from './bff/run-execution-history-http';
import {
  decodeExecutionHistory,
  validExecutionHistoryQuery,
} from './bff/run-execution-history-schemas';

/** No-store same-origin GET with bounded read retry/cancellation; never acquires CSRF, control or execution authority. */
export function createRunExecutionHistoryClient(
  options: RunSupervisionClientOptions,
): RunExecutionHistoryClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readExecutionHistoryFailure,
  );
  return {
    async getExecutionHistory(
      query,
      signal,
    ): Promise<RunExecutionHistoryResult> {
      if (!validExecutionHistoryQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/execution-history`,
          { method: 'GET' },
          (body) => decodeExecutionHistory(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
  };
}
