import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { createProgressBffClient } from '../src/progress-http';
import { progressApi } from '../src/progress-api';

const query = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
};
const question = {
  requestId: '33333333-3333-4333-8333-333333333333',
  question: ' Which workspace 😀 <script>inert</script>\n',
  requestedAt: '2026-10-25T09:00:00.123456789Z',
  recordedAt: '2026-10-25T09:00:01Z',
};
const answer = {
  responseId: '77777777-7777-4777-8777-777777777777',
  answer: ' Exact 😀 <script>answer</script>\n',
  respondedAt: '2026-10-24T09:00:00.123456789Z',
  recordedAt: '2026-10-25T09:00:03Z',
};
const page = { items: [{ ...question, response: answer }], truncated: false };
const signal = (): AbortSignal => new AbortController().signal;
const hundred = Array.from({ length: 100 }, (_, index) => ({
  ...question,
  requestId: `00000000-0000-4000-8000-${(100 - index).toString(16).padStart(12, '0')}`,
  response: null,
}));

describe('requester-only question history', () => {
  it('keeps a shared history request alive until its last reader retires', async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const store = configureStore({
      reducer: { [progressApi.reducerPath]: progressApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: {
            extraArgument: {
              progressClient: {
                read: vi.fn(),
                readQuestions: (_query: typeof query, signal: AbortSignal) => {
                  requestSignal = signal;
                  return new Promise(() => undefined);
                },
              },
            },
          },
        }).concat(progressApi.middleware),
    });
    try {
      const first = store.dispatch(
        progressApi.endpoints.questions.initiate(query),
      );
      const second = store.dispatch(
        progressApi.endpoints.questions.initiate(query),
      );
      first.unsubscribe();
      await vi.advanceTimersByTimeAsync(1);
      expect(requestSignal?.aborted).toBe(false);
      second.unsubscribe();
      await vi.advanceTimersByTimeAsync(1);
      expect(requestSignal?.aborted).toBe(true);
    } finally {
      store.dispatch(progressApi.util.resetApiState());
      vi.useRealTimers();
    }
  });
  it.each([undefined, null, answer])(
    'preserves exact coverage and strips private fields: %j',
    async (response) => {
      const item = {
        ...question,
        ...(response === undefined ? {} : { response }),
      };
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json({
          items: [
            {
              ...item,
              authorActorId: 'PRIVATE',
              claimId: 'PRIVATE',
              ...(response
                ? { response: { ...response, requesterActorId: 'PRIVATE' } }
                : {}),
            },
          ],
          truncated: false,
        }),
      );
      const result = await createProgressBffClient({ fetch }).readQuestions(
        query,
        signal(),
      );
      expect(result).toEqual({
        ok: true,
        questions: { items: [item], truncated: false },
      });
      expect(JSON.stringify(result)).not.toContain('PRIVATE');
      expect(fetch).toHaveBeenCalledWith(
        `/bff/v1/tenants/${query.tenantId}/requester-cases/${query.caseId}/information-requests`,
        expect.objectContaining({
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );
  it('accepts empty and latest-100 histories without inventing complete coverage', async () => {
    for (const history of [
      { items: [], truncated: false },
      { items: hundred, truncated: true },
    ]) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(history));
      expect(
        await createProgressBffClient({ fetch }).readQuestions(query, signal()),
      ).toEqual({ ok: true, questions: history });
    }
  });
  it.each([
    { ...page, truncated: true },
    { items: [...hundred, question], truncated: false },
    { items: [question, question], truncated: false },
    { items: [hundred[99], hundred[0]], truncated: false },
    ...['', ' \u00a0\u001c', '\u0000', '\ud800', '😀'.repeat(4001)].map(
      (value) => ({
        items: [{ ...question, question: value }],
        truncated: false,
      }),
    ),
    ...[
      {},
      false,
      { ...answer, responseId: 'wrong' },
      { ...answer, answer: '\ud800' },
      { ...answer, answer: ' \u00a0' },
      { ...answer, recordedAt: '2026-02-30T00:00:00Z' },
    ].map((response) => ({
      items: [{ ...question, response }],
      truncated: false,
    })),
    {
      items: [{ ...question, recordedAt: '2026-10-25T24:00:00Z' }],
      truncated: false,
    },
    {
      items: [
        { ...hundred[0], response: answer },
        { ...hundred[1], response: answer },
      ],
      truncated: false,
    },
  ])(
    'rejects a malformed complete observation without retry: %j',
    async (history) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(history));
      expect(
        await createProgressBffClient({ fetch }).readQuestions(query, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it.each([401, 403, 404, 503])(
    'maps safe failures for history: %s',
    async (status) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json(
          {
            type: `urn:ergon:problem:${status === 401 ? 'browser-authentication-required' : 'requester-case-not-found'}`,
            signInPath: '/bff/login',
            detail: 'PRIVATE',
          },
          { status },
        ),
      );
      const kind =
        status === 401
          ? 'authentication-required'
          : status === 403
            ? 'forbidden'
            : status === 404
              ? 'not-found'
              : 'unavailable';
      expect(
        await createProgressBffClient({ fetch }).readQuestions(query, signal()),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(status === 503 ? 2 : 1);
    },
  );
  it('bounds and interrupts history attempts using the shared read runner', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(
          (_url, init) =>
            new Promise((_resolve, reject) =>
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('PRIVATE', 'AbortError')),
              ),
            ),
        );
      const client = createProgressBffClient({ fetch, requestTimeout: 20 });
      const timed = client.readQuestions(query, signal());
      await vi.advanceTimersByTimeAsync(60);
      expect(await timed).toEqual({ ok: false, error: { kind: 'timeout' } });
      expect(fetch).toHaveBeenCalledTimes(2);
      const abort = new AbortController();
      const cancelled = client.readQuestions(query, abort.signal);
      abort.abort();
      expect(await cancelled).toEqual({
        ok: false,
        error: { kind: 'request-cancelled' },
      });
    } finally {
      vi.useRealTimers();
    }
  });
  it('contains history client defects before RTK serialization or console logging', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [progressApi.reducerPath]: progressApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: {
            extraArgument: {
              progressClient: {
                read: vi.fn(),
                readQuestions: () => {
                  throw new Error('PRIVATE');
                },
              },
            },
          },
        }).concat(progressApi.middleware),
    });
    try {
      const result = await store.dispatch(
        progressApi.endpoints.questions.initiate(query),
      );
      expect(result.error).toEqual({ kind: 'unexpected-defect' });
      expect(JSON.stringify(store.getState())).not.toContain('PRIVATE');
      expect(log).not.toHaveBeenCalled();
    } finally {
      store.dispatch(progressApi.util.resetApiState());
      log.mockRestore();
    }
  });
});
