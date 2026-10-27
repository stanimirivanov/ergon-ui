import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createProgressBffClient,
  isRequesterAnswerText,
  progressApi,
  type RequesterAnswerCommand,
} from '../src';

const command: RequesterAnswerCommand = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
  requestId: '22222222-2222-4222-8222-222222222222',
  responseId: '77777777-7777-4777-8777-777777777777',
  answer: ' Exact 😀 <script>inert</script>\nanswer ',
};
const receipt = {
  ...command,
  respondedAt: '2026-10-27T09:00:00.123456789Z',
  recordedAt: '2026-10-27T09:00:00.000001Z',
};
const csrf = (): Response =>
  Response.json({ headerName: 'X-CSRF-TOKEN', token: 'session-token' });
const signal = (): AbortSignal => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('requester answer protocol', () => {
  it('keeps a recognized CSRF rejection recoverable without posting', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json(
          { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
          { status: 403 },
        ),
      );
    expect(
      await createProgressBffClient({ fetch }).recordAnswer(command, signal()),
    ).toEqual({ ok: false, error: { kind: 'csrf-rejected' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never maps a CSRF setup problem into an answer rejection', async () => {
    for (const [status, type] of [
      [400, 'invalid-requester-response'],
      [409, 'requester-response-conflict'],
      [404, 'requester-response-not-found'],
    ] as const) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          Response.json({ type: `urn:ergon:problem:${type}` }, { status }),
        );
      expect(
        await createProgressBffClient({ fetch }).recordAnswer(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'unexpected-response' } });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it.each([200, 201])(
    'acknowledges exact intent with status %s without returning private fields',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(csrf())
        .mockResolvedValueOnce(
          Response.json(
            { ...receipt, requesterActorId: 'PRIVATE' },
            { status },
          ),
        );
      const result = await createProgressBffClient({ fetch }).recordAnswer(
        command,
        signal(),
      );
      expect(result).toEqual({ ok: true, responseId: command.responseId });
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/v1/csrf',
        expect.objectContaining({
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `/bff/v1/tenants/${command.tenantId}/requester-cases/${command.caseId}/information-requests/${command.requestId}/responses`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: expect.any(AbortSignal),
          headers: expect.objectContaining({
            'X-CSRF-TOKEN': 'session-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            responseId: command.responseId,
            answer: command.answer,
          }),
        }),
      );
    },
  );
  it.each([
    { ...receipt, responseId: command.caseId },
    { ...receipt, requestId: command.caseId },
    { ...receipt, caseId: command.tenantId },
    { ...receipt, answer: command.answer.trim() },
    { ...receipt, respondedAt: '2026-02-31T00:00:00Z' },
    { ...receipt, recordedAt: 'yesterday' },
    { responseId: command.responseId },
  ])(
    'rejects a mismatched or malformed acknowledgement without replaying',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(csrf())
        .mockResolvedValueOnce(Response.json(body));
      expect(
        await createProgressBffClient({ fetch }).recordAnswer(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each([
    [404, 'requester-response-not-found', 'not-found'],
    [409, 'requester-response-conflict', 'answer-conflict'],
    [400, 'invalid-requester-response', 'invalid-answer'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
    [403, 'human-actor-not-registered', 'forbidden'],
    [503, 'browser-authentication-unavailable', 'unavailable'],
    [409, 'other-problem', 'unexpected-response'],
  ])(
    'maps HTTP %s %s without raw causes or retry',
    async (status, type, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(csrf())
        .mockResolvedValueOnce(
          Response.json(
            { type: `urn:ergon:problem:${type}`, detail: 'PRIVATE' },
            { status: Number(status) },
          ),
        );
      expect(
        await createProgressBffClient({ fetch }).recordAnswer(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('accepts only the canonical sign-in problem and never sends a POST after failed CSRF', async () => {
    for (const signInPath of ['/bff/login', 'https://evil.test']) {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json(
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath,
          },
          { status: 401 },
        ),
      );
      expect(
        await createProgressBffClient({ fetch }).recordAnswer(
          command,
          signal(),
        ),
      ).toEqual({
        ok: false,
        error: {
          kind:
            signInPath === '/bff/login'
              ? 'authentication-required'
              : 'unexpected-response',
        },
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it.each([
    { headerName: 'Authorization', token: 'secret' },
    { headerName: 'X-CSRF-TOKEN', token: '\r\nheader' },
    { headerName: 'X-CSRF-TOKEN', token: ' ' },
  ])('does not send a command after invalid CSRF', async (body) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(body));
    expect(
      await createProgressBffClient({ fetch }).recordAnswer(command, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('uses fresh CSRF but byte-identical body on explicit recovery; a failed POST is never retried automatically', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(csrf())
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce(
        Response.json({
          headerName: 'X-CSRF-TOKEN',
          token: 'new-session-token',
        }),
      )
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createProgressBffClient({ fetch });
    expect(await client.recordAnswer(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.recordAnswer(command, signal())).toEqual({
      ok: true,
      responseId: command.responseId,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[3]?.[1]?.body);
    expect(fetch.mock.calls[3]?.[1]?.headers).toMatchObject({
      'X-CSRF-TOKEN': 'new-session-token',
    });
  });
  it('bounds an uncertain POST and retires its signal without another attempt', async () => {
    vi.useFakeTimers();
    let postedSignal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(csrf())
      .mockImplementationOnce((_url, init) => {
        postedSignal = init?.signal;
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      });
    const pending = createProgressBffClient({
      fetch,
      requestTimeout: 10,
    }).recordAnswer(command, signal());
    await vi.advanceTimersByTimeAsync(10);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(postedSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('contains an injected defect without serializing or logging its diagnostics', async () => {
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const client = {
      recordAnswer: vi.fn(async () => {
        throw new Error('PRIVATE-DEFECT');
      }),
    };
    const store = configureStore({
      reducer: { [progressApi.reducerPath]: progressApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: { extraArgument: { progressClient: client } },
        }).concat(progressApi.middleware),
    });
    const handle = store.dispatch(
      progressApi.endpoints.recordAnswer.initiate(command),
    );
    expect(await handle).toEqual({ error: { kind: 'unexpected-defect' } });
    expect(JSON.stringify(store.getState())).not.toContain('PRIVATE-DEFECT');
    expect(logged).not.toHaveBeenCalled();
    handle.reset();
    expect(store.getState().requesterProgressApi.mutations).toEqual({});
  });
  it.each(['', ' \n\t\u001c\u00a0', 'x\u0000', '\ud800', 'x'.repeat(4001)])(
    'rejects invalid text before network I/O',
    async (answer) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      expect(isRequesterAnswerText(answer)).toBe(false);
      expect(
        await createProgressBffClient({ fetch }).recordAnswer(
          { ...command, answer },
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-answer' } });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('counts supplementary characters as single code points and preserves accepted whitespace', () => {
    expect(isRequesterAnswerText('😀'.repeat(4000))).toBe(true);
    expect(isRequesterAnswerText(' exact text \n')).toBe(true);
  });
});
