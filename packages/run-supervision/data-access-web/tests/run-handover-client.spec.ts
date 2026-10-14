import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  runSupervisionApi,
  type RunSupervisionClient,
  type RunSupervisorHandoverClient,
  type RunSupervisorHandoverCommand,
} from '../src';
import {
  TENANT_ID,
  RUN_ID,
  OTHER_RUN_ID,
  jsonResponse,
  validConsole,
  validPage,
} from './run-supervision-fixtures';

const command: RunSupervisorHandoverCommand = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedSupervisionRevision: 3,
  supervisorActorId: '88888888-8888-4888-8888-888888888888',
};
const receipt = {
  commandId: command.commandId,
  runId: RUN_ID,
  supervisionRevision: 4,
  handedOverAt: '2026-10-14T08:00:00Z',
  recordedAt: '2026-10-14T08:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral-test-token' };
const signal = (): AbortSignal => new AbortController().signal;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('run supervisor handover boundary', () => {
  it('obtains fresh CSRF for each exact invocation and checks the receipt before returning success', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(
        jsonResponse({ ...receipt, authorityEvidenceId: 'PRIVATE_AUDIT' }, 201),
      )
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(jsonResponse(receipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.handoverSupervisor(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(await client.handoverSupervisor(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[0]?.[0]).toBe('/bff/v1/csrf');
    expect(fetch.mock.calls[2]?.[0]).toBe('/bff/v1/csrf');
    for (const index of [1, 3]) {
      expect(fetch.mock.calls[index]?.[0]).toBe(
        `/bff/v1/tenants/${TENANT_ID}/resolution-runs/${RUN_ID}/supervisor-handovers`,
      );
      expect(fetch.mock.calls[index]?.[1]).toMatchObject({
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf.token,
          'Content-Type': 'application/json',
        },
      });
      expect(JSON.parse(String(fetch.mock.calls[index]?.[1]?.body))).toEqual({
        commandId: command.commandId,
        expectedSupervisionRevision: 3,
        supervisorActorId: command.supervisorActorId,
      });
    }
  });

  it.each([
    { ...receipt, runId: OTHER_RUN_ID },
    { ...receipt, commandId: OTHER_RUN_ID },
    { ...receipt, supervisionRevision: 5 },
  ])(
    'rejects foreign or mismatched successful receipts without retrying the POST',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(jsonResponse(body, 201));
      expect(
        await createRunSupervisionClient({ fetch }).handoverSupervisor(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    [503, 'run-supervisor-handover-disabled', 'handover-disabled'],
    [409, 'run-supervisor-handover-conflict', 'handover-conflict'],
    [409, 'run-supervisor-not-eligible', 'recipient-not-eligible'],
    [409, 'run-supervisor-handover-unavailable', 'handover-unavailable'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
    [404, 'assigned-resolution-run-not-found', 'not-found'],
  ] as const)(
    'maps %i %s without exposing private problem details or automatic transfer retries',
    async (status, problem, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse(
            {
              type: `urn:ergon:problem:${problem}`,
              detail: 'PRIVATE_DIAGNOSTIC',
            },
            status,
          ),
        );
      const result = await createRunSupervisionClient({
        fetch,
      }).handoverSupervisor(command, signal());
      expect(result).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it('validates command and CSRF before issuing a transfer', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ ...csrf, token: 'bad\r\nheader' }));
    const client = createRunSupervisionClient({ fetch });
    expect(
      await client.handoverSupervisor(
        { ...command, expectedSupervisionRevision: Number.MAX_SAFE_INTEGER },
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-handover' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(await client.handoverSupervisor(command, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('bounds hanging token setup and physically retires it without sending a POST', async () => {
    vi.useFakeTimers();
    const body = jsonResponse(csrf);
    vi.spyOn(body, 'json').mockImplementation(
      () => new Promise(() => undefined),
    );
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(body);
    const pending = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 10,
    }).handoverSupervisor(command, signal());
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('reports caller cancellation instead of an AbortError transport failure during POST', async () => {
    const started = deferred<void>();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('aborted', 'AbortError')),
              { once: true },
            );
            started.resolve();
          }),
      );
    const controller = new AbortController();
    const pending = createRunSupervisionClient({ fetch }).handoverSupervisor(
      command,
      controller.signal,
    );
    await started.promise;
    controller.abort();
    expect(await pending).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
  });

  it('keeps candidate epoch/cursor identity, strips private fields, and rejects stale or unordered pages', async () => {
    const query = {
      tenantId: TENANT_ID,
      runId: RUN_ID,
      expectedSupervisionRevision: 3,
      limit: 1,
    };
    const page = {
      entries: [
        {
          actorId: command.supervisorActorId,
          identitySubject: 'PRIVATE_SUBJECT',
        },
      ],
      nextActorId: null,
      supervisionRevision: 3,
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(page))
      .mockResolvedValueOnce(jsonResponse({ ...page, supervisionRevision: 4 }))
      .mockResolvedValueOnce(
        jsonResponse({ ...page, nextActorId: OTHER_RUN_ID }),
      );
    const client = createRunSupervisionClient({ fetch });
    const result = await client.listHandoverCandidates(query, signal());
    expect(result).toEqual({
      ok: true,
      page: { ...page, entries: [{ actorId: command.supervisorActorId }] },
    });
    expect(fetch.mock.calls[0]?.[0]).toContain(
      'expectedSupervisionRevision=3&limit=1',
    );
    expect(await client.listHandoverCandidates(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    expect(await client.listHandoverCandidates(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('supports older read-only snapshots but rejects partial or contradictory handover metadata', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(validConsole()))
      .mockResolvedValueOnce(
        jsonResponse({ ...validConsole(), supervisionRevision: 0 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ...validConsole(),
          supervisionRevision: 0,
          handoverSupported: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ...validConsole(),
          state: 'VERIFIED_RESOLVED',
          supervisionRevision: 0,
          handoverSupported: true,
        }),
      );
    const client = createRunSupervisionClient({ fetch });
    expect(
      (
        await client.getConsole(
          { tenantId: TENANT_ID, runId: RUN_ID },
          signal(),
        )
      ).ok,
    ).toBe(true);
    for (let index = 0; index < 3; index++)
      expect(
        await client.getConsole(
          { tenantId: TENANT_ID, runId: RUN_ID },
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
  });

  it('contains a rejected command client before Redux or console receives its raw cause', async () => {
    const sentinel = 'PRIVATE_HANDOVER_DEFECT';
    const logger = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const client: RunSupervisionClient & RunSupervisorHandoverClient = {
      listAssigned: async () => ({ ok: true, page: validPage() }),
      getConsole: async () => ({ ok: true, console: validConsole() }),
      listHandoverCandidates: async () => ({
        ok: false,
        error: { kind: 'not-found' },
      }),
      handoverSupervisor: async () => {
        throw new Error(sentinel);
      },
    };
    const store = configureStore({
      reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: { extraArgument: { runSupervision: client } },
        }).concat(runSupervisionApi.middleware),
    });
    const request = store.dispatch(
      runSupervisionApi.endpoints.handoverRunSupervisor.initiate(command),
    );
    try {
      expect(await request).toEqual({ error: { kind: 'unexpected-defect' } });
      expect(JSON.stringify(store.getState())).not.toContain(sentinel);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(sentinel);
    } finally {
      request.reset();
      store.dispatch(runSupervisionApi.util.resetApiState());
    }
  });
});

function deferred<A>() {
  let resolve: (value: A | PromiseLike<A>) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
