import { Effect } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunControlClient,
  RunControlReceipt,
  RunControlResult,
  RunControlView,
} from './control-contracts';
import { createRunCommandHttp } from './bff/run-command-http';
import { readHttpFailure } from './bff/run-supervision-http';
import { decodeRunSessionCsrf } from './bff/run-session-csrf';
import {
  decodeRunControlCommand,
  decodeRunControlReceipt,
  decodeRunControlView,
  validRunControlQuery,
} from './bff/run-control-schemas';

/** Invocation-local CSRF, no automatic lifecycle retry, and no cached session bindings. Reading never extends a lease. */
export function createRunControlClient(
  options: RunSupervisionClientOptions,
): RunControlClient {
  const { request, execute } = createRunCommandHttp(options, readHttpFailure);
  return {
    async getRunControl(
      query,
      signal,
    ): Promise<RunControlResult<RunControlView>> {
      if (!validRunControlQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/control`,
          { method: 'GET' },
          (body) => decodeRunControlView(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
    async changeRunControl(
      command,
      signal,
    ): Promise<RunControlResult<RunControlReceipt>> {
      const validated = decodeRunControlCommand(command);
      if (validated === undefined)
        return { ok: false, error: { kind: 'invalid-page' } };
      const { tenantId, runId, ...body } = validated;
      return execute(
        request(
          '/bff/v1/csrf',
          { method: 'GET' },
          decodeRunSessionCsrf,
          signal,
          [200],
        ).pipe(
          Effect.flatMap((csrf) =>
            request(
              `/bff/v1/tenants/${tenantId}/resolution-runs/${runId}/control-commands`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  [csrf.headerName]: csrf.token,
                },
                body: JSON.stringify(body),
              },
              (value) => decodeRunControlReceipt(value, validated),
              signal,
              [200],
            ),
          ),
        ),
        signal,
        false,
      );
    },
  };
}
