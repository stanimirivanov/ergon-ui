import { describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  type RunPinnedContractQuery,
} from '../src';
import { pinnedContractExample as example } from './pinned-contract-fixtures';
import { jsonResponse, TENANT_ID, RUN_ID } from './run-supervision-fixtures';

const query: RunPinnedContractQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  contractKey: 'access-restoration',
  contractRevision: 1,
  stepId: 'restore-access',
  capability: 'access.restore',
};
const signal = () => new AbortController().signal;

describe('exact pinned-contract boundary', () => {
  it('requests only the run route without authority params, keeps exact values/order/backsteps and strips extras', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ...example,
        secret: 'PRIVATE',
        contract: { ...example.contract, originalYaml: 'PRIVATE' },
      }),
    );
    const result = await createRunSupervisionClient({
      fetch,
    }).getPinnedContract(query, signal());
    expect(result).toEqual({ ok: true, value: example });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${TENANT_ID}/resolution-runs/${RUN_ID}/pinned-contract`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it.each([
    { ...example, runId: TENANT_ID },
    { ...example, supervisionRevision: 4 },
    { ...example, pinnedStepId: 'other' },
    { ...example, contractRecordedAt: 'not-time' },
    { ...example, contract: { ...example.contract, schema: 'v2' } },
    { ...example, contract: { ...example.contract, revision: 2 } },
    { ...example, contract: { ...example.contract, key: 'latest' } },
    { ...example, contract: { ...example.contract, requiredEvidence: [] } },
    {
      ...example,
      contract: { ...example.contract, requiredEvidence: ['account.owner'] },
    },
    {
      ...example,
      contract: {
        ...example.contract,
        requiredEvidence: ['account.state', 'account.state'],
      },
    },
    { ...example, contract: { ...example.contract, steps: [] } },
    {
      ...example,
      contract: {
        ...example.contract,
        steps: [example.contract.steps[1], example.contract.steps[1]],
      },
    },
    {
      ...example,
      contract: {
        ...example.contract,
        steps: [{ ...example.contract.steps[1], capability: 'other.action' }],
      },
    },
    {
      ...example,
      contract: {
        ...example.contract,
        steps: [
          { ...example.contract.steps[1], risk: 'HIGH', approval: 'NONE' },
        ],
      },
    },
    {
      ...example,
      contract: {
        ...example.contract,
        applicability: { fact: 'accountXstate', equals: 'x' },
      },
    },
    {
      ...example,
      contract: {
        ...example.contract,
        outcomeProof: { fact: 'account.state', equals: 'x'.repeat(201) },
      },
    },
  ])(
    'rejects inconsistent definitions once without partial success %#',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(jsonResponse(body));
      expect(
        await createRunSupervisionClient({ fetch }).getPinnedContract(
          query,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('accepts 50 ordered declarations, rejects 51, without equating LOW declaration to HIGH effective policy', async () => {
    for (const size of [50, 51]) {
      const steps = Array.from({ length: size }, (_, i) =>
        i === 0
          ? example.contract.steps[1]
          : {
              id: 'step-' + i,
              capability: 'account.inspect',
              risk: 'LOW',
              approval: 'NONE',
            },
      );
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        jsonResponse({
          ...example,
          contract: { ...example.contract, steps },
        }),
      );
      const result = await createRunSupervisionClient({
        fetch,
      }).getPinnedContract(query, signal());
      expect(result.ok).toBe(size === 50);
    }
  });
  it.each([
    [404, 'urn:ergon:problem:assigned-resolution-run-not-found', 'not-found'],
    [404, 'about:blank', 'contract-unsupported'],
    [405, 'about:blank', 'contract-unsupported'],
    [501, 'about:blank', 'contract-unsupported'],
    [
      403,
      'urn:ergon:problem:human-actor-not-registered',
      'actor-not-registered',
    ],
    [
      503,
      'urn:ergon:problem:browser-authentication-unavailable',
      'authentication-unavailable',
    ],
  ])('maps safe status %s and problem %s', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ type, detail: 'PRIVATE' }, status));
    expect(
      await createRunSupervisionClient({ fetch }).getPinnedContract(
        query,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
  });
  it('retries transient reads once and cancels held transport without leaking causes', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(example));
    expect(
      (
        await createRunSupervisionClient({ fetch }).getPinnedContract(
          query,
          signal(),
        )
      ).ok,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const held = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('PRIVATE', 'AbortError')),
          );
          markStarted();
        }),
    );
    const controller = new AbortController();
    const result = createRunSupervisionClient({
      fetch: held,
    }).getPinnedContract(query, controller.signal);
    await started;
    controller.abort();
    expect(await result).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });
  it('rejects invalid local expectations before I/O', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(
      await createRunSupervisionClient({ fetch }).getPinnedContract(
        { ...query, contractRevision: 0 },
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).not.toHaveBeenCalled();
  });
});
