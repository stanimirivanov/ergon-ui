import type {
  RunPinnedReadinessClient,
  RunPinnedReadinessResult,
} from './pinned-readiness-contracts';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import { createRunCommandHttp } from './bff/run-command-http';
import { readInspectionFailure } from './bff/run-inspection-http';
import {
  decodePinnedReadiness,
  validPinnedReadinessQuery,
} from './bff/run-pinned-readiness-schemas';

/** Exact no-store same-origin read with bounded transient retry/deadline/cancellation. Never acquires CSRF, a lease or execution authority; unexpected defects may reject. */
export function createRunPinnedReadinessClient(
  options: RunSupervisionClientOptions,
): RunPinnedReadinessClient {
  const { request, execute } = createRunCommandHttp(
    options,
    (response, signal) =>
      readInspectionFailure(response, signal, 'readiness-unsupported'),
  );
  return {
    async getPinnedReadiness(query, signal): Promise<RunPinnedReadinessResult> {
      if (!validPinnedReadinessQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/pinned-readiness`,
          { method: 'GET' },
          (body) => decodePinnedReadiness(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
  };
}
