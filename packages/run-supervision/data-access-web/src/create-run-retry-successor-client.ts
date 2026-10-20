import type {
  RunRetrySuccessorClient,
  RunRetrySuccessorResult,
} from './retry-successor-contracts';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import { createRunCommandHttp } from './bff/run-command-http';
import { readRetrySuccessorFailure } from './bff/run-retry-successor-http';
import {
  decodeRetrySuccessor,
  validRetrySuccessorQuery,
} from './bff/run-retry-successor-schemas';

/** Same-origin/no-store GET with the existing bounded read policy; no command, CSRF, lease or target preload. */
export function createRunRetrySuccessorClient(
  options: RunSupervisionClientOptions,
): RunRetrySuccessorClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readRetrySuccessorFailure,
  );
  return {
    async getRetrySuccessor(query, signal): Promise<RunRetrySuccessorResult> {
      if (!validRetrySuccessorQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/retry-successor`,
          { method: 'GET' },
          (body) => decodeRetrySuccessor(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
  };
}
