import type {
  RunInvocationHistoryClient,
  RunInvocationHistoryResult,
} from './invocation-history-contracts';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import { createRunCommandHttp } from './bff/run-command-http';
import { readExecutionHistoryFailure } from './bff/run-execution-history-http';
import {
  decodeInvocationHistory,
  validInvocationHistoryQuery,
} from './bff/run-invocation-history-schemas';

/** No-store same-origin GET with bounded read retry/cancellation; never acquires CSRF, control or execution authority. */
export function createRunInvocationHistoryClient(
  options: RunSupervisionClientOptions,
): RunInvocationHistoryClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readExecutionHistoryFailure,
  );
  return {
    async getInvocationHistory(
      query,
      signal,
    ): Promise<RunInvocationHistoryResult> {
      if (!validInvocationHistoryQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/invocation-history`,
          { method: 'GET' },
          (body) => decodeInvocationHistory(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
  };
}
