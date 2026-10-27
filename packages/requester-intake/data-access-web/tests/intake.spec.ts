import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createIntakeBffClient,
  intakeApi,
  normalizeIntakeGoal,
  normalizeIntakeObservation,
  type IntakeClient,
  type IntakeCommand,
} from '../src';

const command: IntakeCommand = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
  goal: ' Restore access ',
  initialObservation: ' <script>inert</script> 😀\nDetails. ',
};
const receipt = {
  caseId: command.caseId,
  goal: 'Restore access',
  initialObservation: '<script>inert</script> 😀\nDetails.',
  openedAt: '2026-10-27T10:00:00.123456789Z',
  recordedAt: '2026-10-27T09:59:59.000001Z',
};
const csrf = (): Response =>
  Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' });
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('intake protocol', () => {
  it('retires the response body when the invocation times out after headers', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    let body: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        body = controller;
      },
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation((_url, init) => {
        signal = init?.signal;
        signal?.addEventListener(
          'abort',
          () => body?.error(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
        return Promise.resolve(new Response(stream));
      });
    const pending = createIntakeBffClient({ fetch, requestTimeout: 20 }).submit(
      command,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(21);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    const aborted = signal?.aborted;
    if (!aborted) body?.close();
    expect(aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([200, 201])(
    'acknowledges only exact normalized intent at %s without retaining receipt data',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(csrf())
        .mockResolvedValueOnce(
          Response.json({ ...receipt, providerToken: 'discard' }, { status }),
        );
      expect(
        await createIntakeBffClient({ fetch }).submit(
          command,
          new AbortController().signal,
        ),
      ).toEqual({ ok: true, caseId: command.caseId });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[0]?.[0]).toBe('/bff/v1/csrf');
      expect(fetch.mock.calls[1]?.[0]).toBe(
        '/bff/v1/tenants/' + command.tenantId + '/requester-cases',
      );
      const init = fetch.mock.calls[1]?.[1];
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': 'fresh' },
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        caseId: command.caseId,
        goal: command.goal,
        initialObservation: command.initialObservation,
      });
    },
  );
  it.each([
    { ...receipt, caseId: '30000000-0000-4000-8000-000000000003' },
    { ...receipt, goal: command.goal },
    { ...receipt, initialObservation: 'Other' },
    { ...receipt, openedAt: '2026-02-30T10:00:00Z' },
    { ...receipt, recordedAt: '2026-10-27T10:00:00+01:00' },
    { caseId: command.caseId },
  ])('rejects incomplete, mismatched or malformed receipts', async (value) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(csrf())
      .mockResolvedValueOnce(Response.json(value));
    expect(
      await createIntakeBffClient({ fetch }).submit(
        command,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    [400, 'invalid-requester-case-intake', 'invalid-input'],
    [409, 'requester-case-intake-conflict', 'intake-conflict'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
    [403, 'human-actor-not-registered', 'forbidden'],
    [503, 'browser-authentication-unavailable', 'unavailable'],
  ] as const)('maps %s %s without diagnostics', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(csrf())
      .mockResolvedValueOnce(
        Response.json(
          { type: 'urn:ergon:problem:' + type, detail: 'private-sentinel' },
          { status },
        ),
      );
    expect(
      await createIntakeBffClient({ fetch }).submit(
        command,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not classify a CSRF-stage command problem as editable input rejection', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json(
          { type: 'urn:ergon:problem:invalid-requester-case-intake' },
          { status: 400 },
        ),
      );
    expect(
      await createIntakeBffClient({ fetch }).submit(
        command,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'unexpected-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['/bff/login', 'https://untrusted.example/login'])(
    'accepts only the fixed sign-in path %s',
    async (signInPath) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json(
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath,
          },
          { status: 401 },
        ),
      );
      const result = await createIntakeBffClient({ fetch }).submit(
        command,
        new AbortController().signal,
      );
      expect(result).toEqual({
        ok: false,
        error: {
          kind:
            signInPath === '/bff/login'
              ? 'authentication-required'
              : 'unexpected-response',
        },
      });
    },
  );
  it.each([
    { headerName: 'Injected', token: 'secret' },
    { headerName: 'X-CSRF-TOKEN', token: 'bad\r\nheader' },
  ])('rejects malformed CSRF without POST', async (token) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(token));
    expect(
      await createIntakeBffClient({ fetch }).submit(
        command,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('obtains fresh invocation-local CSRF on explicit replay, never automatic retry', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(csrf())
      .mockRejectedValueOnce(new Error('private-network'))
      .mockResolvedValueOnce(
        Response.json({ headerName: 'X-CSRF-TOKEN', token: 'second' }),
      )
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createIntakeBffClient({ fetch });
    expect(await client.submit(command, new AbortController().signal)).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.submit(command, new AbortController().signal)).toEqual({
      ok: true,
      caseId: command.caseId,
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[3]?.[1]?.body).toEqual(
      fetch.mock.calls[1]?.[1]?.body,
    );
    expect(fetch.mock.calls[3]?.[1]?.headers).toMatchObject({
      'X-CSRF-TOKEN': 'second',
    });
  });
  it('bounds the whole invocation and connects cancellation to the owned fetch', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation((_url, init) => {
        signal = init?.signal;
        return new Promise(() => undefined);
      });
    const result = createIntakeBffClient({ fetch, requestTimeout: 20 }).submit(
      command,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(21);
    expect(await result).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports explicit cancellation rather than transport failure', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const controller = new AbortController();
    const pending = createIntakeBffClient({ fetch }).submit(
      command,
      controller.signal,
    );
    controller.abort();
    expect(await pending).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });
});
describe('intake input and cache boundary', () => {
  it('matches Kotlin trimming and UTF-16 bounds without changing raw intent', () => {
    expect(normalizeIntakeGoal('\u001c\u00a0 goal \u001f')).toBe('goal');
    expect(normalizeIntakeGoal('\ufeff')).toBe('\ufeff');
    expect(normalizeIntakeGoal('😀'.repeat(250))).toHaveLength(500);
    expect(normalizeIntakeGoal('😀'.repeat(251))).toBeUndefined();
    expect(normalizeIntakeObservation('x'.repeat(8000))).toHaveLength(8000);
    expect(normalizeIntakeObservation('x'.repeat(8001))).toBeUndefined();
    expect(normalizeIntakeGoal('bad\ud800')).toBeUndefined();
    expect(normalizeIntakeObservation('bad\u0000')).toBeUndefined();
  });
  it('rejects invalid commands before any fetch', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(
      await createIntakeBffClient({ fetch }).submit(
        { ...command, goal: ' ' },
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-input' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('contains thrown defects before framework logging/state and clears mutation intent', async () => {
    const error = new Error('private-defect-sentinel');
    const logger = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const client: IntakeClient = {
      submit: async () => {
        throw error;
      },
    };
    const store = configureStore({
      reducer: { [intakeApi.reducerPath]: intakeApi.reducer },
      middleware: (defaults) =>
        defaults({ thunk: { extraArgument: { intakeClient: client } } }).concat(
          intakeApi.middleware,
        ),
    });
    const handle = store.dispatch(intakeApi.endpoints.submit.initiate(command));
    expect(await handle).toEqual({ error: { kind: 'unexpected-defect' } });
    expect(JSON.stringify(store.getState())).not.toContain(
      'private-defect-sentinel',
    );
    expect(logger).not.toHaveBeenCalled();
    handle.reset();
    expect(
      Object.keys(store.getState().requesterIntakeApi.mutations),
    ).toHaveLength(0);
  });
  it('contains missing bindings instead of throwing into RTK', async () => {
    const store = configureStore({
      reducer: { [intakeApi.reducerPath]: intakeApi.reducer },
      middleware: (defaults) => defaults().concat(intakeApi.middleware),
    });
    const handle = store.dispatch(intakeApi.endpoints.submit.initiate(command));
    expect(await handle).toEqual({ error: { kind: 'unexpected-defect' } });
    handle.reset();
  });
});
