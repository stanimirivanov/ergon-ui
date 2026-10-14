import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  runSupervisionApi,
  type RunApprovalCommand,
  type RunApprovalClient,
  type RunSupervisionClient,
} from '../src';
import {
  TENANT_ID,
  RUN_ID,
  OTHER_RUN_ID,
  jsonResponse,
} from './run-supervision-fixtures';

const command: RunApprovalCommand = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  requestId: OTHER_RUN_ID,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedSupervisionRevision: 3,
  outcome: 'APPROVED',
};
const receipt = {
  commandId: command.commandId,
  runId: command.runId,
  requestId: command.requestId,
  supervisionRevision: 3,
  decisionId: '88888888-8888-4888-8888-888888888888',
  outcome: 'APPROVED',
  decidedAt: '2026-10-14T12:00:00.123456Z',
  recordedAt: '2026-10-14T12:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral-approval-token' };
const signal = () => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('confirmed approval transport', () => {
  it('uses invocation-local CSRF and an unchanged exact tuple on replay, stripping private receipt fields', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(
        jsonResponse({ ...receipt, actorId: 'PRIVATE' }, 201),
      )
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(jsonResponse(receipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.decideApproval(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(await client.decideApproval(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    for (const index of [1, 3]) {
      expect(fetch.mock.calls[index]?.[0]).toBe(
        `/bff/v1/tenants/${TENANT_ID}/resolution-runs/${RUN_ID}/approval-requests/${OTHER_RUN_ID}/decisions`,
      );
      const init = fetch.mock.calls[index]?.[1];
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': csrf.token },
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        commandId: command.commandId,
        expectedSupervisionRevision: 3,
        outcome: 'APPROVED',
      });
    }
  });
  it.each([
    { ...receipt, requestId: RUN_ID },
    { ...receipt, runId: OTHER_RUN_ID },
    { ...receipt, commandId: RUN_ID },
    { ...receipt, supervisionRevision: 4 },
    { ...receipt, outcome: 'REJECTED' },
  ])(
    'rejects mismatched acknowledgement without another POST',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(jsonResponse(body, 201));
      expect(
        await createRunSupervisionClient({ fetch }).decideApproval(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each([
    [503, 'run-approval-disabled', 'approval-disabled'],
    [409, 'run-approval-conflict', 'approval-conflict'],
    [403, 'run-approval-authority-missing', 'approval-authority-missing'],
    [400, 'invalid-run-approval', 'invalid-approval'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
  ] as const)(
    'maps a stable approval problem without automatic command retry',
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
        await createRunSupervisionClient({ fetch }).decideApproval(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('contains a hanging POST body within the shared deadline and physically releases its controller', async () => {
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
    }).decideApproval(command, signal());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(11);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(postSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not acquire transport for malformed intent or an already cancelled caller', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = createRunSupervisionClient({ fetch });
    expect(
      await client.decideApproval(
        { ...command, expectedSupervisionRevision: -1 },
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-approval' } });
    const cancelled = new AbortController();
    cancelled.abort();
    expect(await client.decideApproval(command, cancelled.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('contains a rejected client before RTK logging or serialization, including missing writer bindings', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const writer of [
      undefined,
      vi
        .fn<RunApprovalClient['decideApproval']>()
        .mockRejectedValue(new Error('PRIVATE_SENTINEL')),
    ]) {
      const client: RunSupervisionClient & Partial<RunApprovalClient> = {
        listAssigned: vi.fn(),
        getConsole: vi.fn(),
        ...(writer === undefined ? {} : { decideApproval: writer }),
      };
      const store = configureStore({
        reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
        middleware: (getDefault) =>
          getDefault({
            thunk: { extraArgument: { runSupervision: client } },
          }).concat(runSupervisionApi.middleware),
      });
      const request = store.dispatch(
        runSupervisionApi.endpoints.decideRunApproval.initiate(command),
      );
      expect(await request).toMatchObject({
        error: { kind: 'unexpected-defect' },
      });
      expect(JSON.stringify(store.getState())).not.toContain(
        'PRIVATE_SENTINEL',
      );
      request.reset();
      store.dispatch(runSupervisionApi.util.resetApiState());
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
