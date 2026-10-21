import type {
  RunPinnedContractClient,
  RunPinnedContractResult,
} from './pinned-contract-contracts';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import { createRunCommandHttp } from './bff/run-command-http';
import { readPinnedContractFailure } from './bff/run-pinned-contract-http';
import {
  decodePinnedContract,
  validPinnedContractQuery,
} from './bff/run-pinned-contract-schemas';

/** No-store same-origin GET with bounded read retry/cancellation; never acquires CSRF, control or execution authority. */
export function createRunPinnedContractClient(
  options: RunSupervisionClientOptions,
): RunPinnedContractClient {
  const { request, execute } = createRunCommandHttp(
    options,
    readPinnedContractFailure,
  );
  return {
    async getPinnedContract(query, signal): Promise<RunPinnedContractResult> {
      if (!validPinnedContractQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/pinned-contract`,
          { method: 'GET' },
          (body) => decodePinnedContract(body, query),
          signal,
          [200],
        ),
        signal,
        true,
      );
    },
  };
}
