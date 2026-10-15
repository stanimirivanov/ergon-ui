import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  runSupervisionApi,
  normalizeRunProofFinalizationFailure,
  type RunProofFinalizationClient,
  type RunProofFinalizationCommand,
  type RunSupervisionClient,
} from '../src';
import {
  TENANT_ID,
  RUN_ID,
  OTHER_RUN_ID,
  jsonResponse,
} from './run-supervision-fixtures';

const command: RunProofFinalizationCommand = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedSupervisionRevision: 3,
  expectedRunVersion: 1,
  expectedCaseVersion: 6,
  factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};
const receipt = {
  commandId: command.commandId,
  runId: RUN_ID,
  supervisionRevision: 3,
  expectedRunVersion: 1,
  assessedCaseVersion: 6,
  factId: command.factId,
  observationId: command.observationId,
  runSequence: 2,
  caseClosureStreamVersion: 7,
  acceptedAt: '2026-10-15T08:00:00.123456Z',
  recordedAt: '2026-10-15T08:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral-proof-token' };
const signal = (): AbortSignal => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('exact reviewed proof finalization', () => {
  it('uses fresh CSRF and unchanged intent on explicit replay, discarding private receipt extras', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(
        jsonResponse({ ...receipt, actorId: 'PRIVATE' }, 201),
      )
      .mockResolvedValueOnce(jsonResponse({ ...csrf, token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse(receipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.finalizeProof(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(await client.finalizeProof(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    const { tenantId, runId, ...intent } = command;
    for (const index of [1, 3]) {
      expect(fetch.mock.calls[index]?.[0]).toBe(
        `/bff/v1/tenants/${tenantId}/resolution-runs/${runId}/proof-finalizations`,
      );
      const init = fetch.mock.calls[index]?.[1];
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': index === 1 ? csrf.token : 'fresh-token' },
      });
      expect(JSON.parse(String(init?.body))).toEqual(intent);
    }
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it.each([
    { ...receipt, commandId: OTHER_RUN_ID },
    { ...receipt, runId: OTHER_RUN_ID },
    { ...receipt, supervisionRevision: 4 },
    { ...receipt, expectedRunVersion: 2 },
    { ...receipt, assessedCaseVersion: 7 },
    { ...receipt, factId: RUN_ID },
    { ...receipt, observationId: RUN_ID },
    { ...receipt, runSequence: 1 },
    { ...receipt, caseClosureStreamVersion: 8 },
    { ...receipt, acceptedAt: 'not-an-instant' },
  ])(
    'rejects an unrelated or inconsistent acknowledgement without retry',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(jsonResponse(body, 201));
      expect(
        await createRunSupervisionClient({ fetch }).finalizeProof(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each([
    [503, 'run-proof-finalization-disabled', 'proof-finalization-disabled'],
    [409, 'run-proof-finalization-conflict', 'proof-finalization-conflict'],
    [400, 'invalid-run-proof-finalization', 'invalid-proof-finalization'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
  ] as const)(
    'maps stable problems without raw cause or automatic POST retry',
    async (status, type, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse(
            { type: `urn:ergon:problem:${type}`, detail: 'PRIVATE' },
            status,
          ),
        );
      expect(
        await createRunSupervisionClient({ fetch }).finalizeProof(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('rejects invalid intent before acquiring CSRF', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = createRunSupervisionClient({ fetch });
    for (const invalid of [
      { ...command, expectedCaseVersion: 0 },
      { ...command, expectedCaseVersion: Number.MAX_SAFE_INTEGER },
      { ...command, expectedSupervisionRevision: -1 },
      { ...command, factId: 'bad' },
      { ...command, expectedRunVersion: 0 },
    ])
      expect(await client.finalizeProof(invalid, signal())).toEqual({
        ok: false,
        error: { kind: 'invalid-proof-finalization' },
      });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds a hanging POST body and physically releases the request without retry', async () => {
    vi.useFakeTimers();
    let postSignal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockImplementationOnce((_url, init) => {
        postSignal = init?.signal;
        return Promise.resolve(
          new Response(new ReadableStream<Uint8Array>(), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });
    const pending = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 10,
    }).finalizeProof(command, signal());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(11);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(postSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('returns cancellation without a setup request when already aborted', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const controller = new AbortController();
    controller.abort();
    expect(
      await createRunSupervisionClient({ fetch }).finalizeProof(
        command,
        controller.signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'request-cancelled' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('contains rejected mutation defects before Redux logging and serializes only safe failures', async () => {
    const client: RunSupervisionClient & RunProofFinalizationClient = {
      listAssigned: vi.fn(),
      getConsole: vi.fn(),
      finalizeProof: async () => {
        throw new Error('PRIVATE');
      },
    };
    const store = configureStore({
      reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
      middleware: (get) =>
        get({ thunk: { extraArgument: { runSupervision: client } } }).concat(
          runSupervisionApi.middleware,
        ),
    });
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const request = store.dispatch(
      runSupervisionApi.endpoints.finalizeRunProof.initiate(command),
    );
    expect(await request).toMatchObject({
      error: { kind: 'unexpected-defect' },
    });
    expect(JSON.stringify(store.getState())).not.toContain('PRIVATE');
    expect(errorLog).not.toHaveBeenCalled();
    request.reset();
    store.dispatch(runSupervisionApi.util.resetApiState());
    expect(
      normalizeRunProofFinalizationFailure({
        kind: 'proof-finalization-conflict',
        detail: 'PRIVATE',
      }),
    ).toEqual({ kind: 'proof-finalization-conflict' });
  });
});
