import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { createProgressBffClient } from '../src/progress-http';
import { progressApi } from '../src/progress-api';

const query = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
};
const payload = {
  caseId: query.caseId,
  goal: '<script>not markup</script>',
  status: 'OPEN',
  openedAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:01.123456789Z',
};
const signal = (): AbortSignal => new AbortController().signal;
describe('requester progress protocol', () => {
  it('sends only a credentialed no-store read and drops unreviewed response fields', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ ...payload, secret: 'private' }));
    const result = await createProgressBffClient({ fetch }).read(
      query,
      signal(),
    );
    expect(result).toEqual({ ok: true, progress: payload });
    expect(fetch).toHaveBeenCalledWith(
      `/bff/v1/tenants/${query.tenantId}/requester-cases/${query.caseId}/progress`,
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it.each([
    { ...payload, caseId: query.tenantId },
    { ...payload, status: 'RUNNING' },
    { ...payload, openedAt: 'yesterday' },
    { ...payload, goal: '' },
    { ...payload, updatedAt: '2026-02-31T00:00:00Z' },
  ])('rejects invalid or mismatched public projections', async (body) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(body));
    expect(
      await createProgressBffClient({ fetch }).read(query, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    [
      404,
      { type: 'urn:ergon:problem:requester-case-not-found', detail: 'private' },
      'not-found',
    ],
    [
      403,
      { type: 'urn:ergon:problem:human-actor-not-registered' },
      'forbidden',
    ],
    [
      401,
      {
        type: 'urn:ergon:problem:browser-authentication-required',
        signInPath: '/bff/login',
      },
      'authentication-required',
    ],
    [
      401,
      {
        type: 'urn:ergon:problem:browser-authentication-required',
        signInPath: 'https://evil.test',
      },
      'unexpected-response',
    ],
    [404, { type: 'something-else' }, 'unexpected-response'],
  ] as const)(
    'maps status %s without retaining problem text',
    async (status, body, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(body, { status }));
      expect(
        await createProgressBffClient({ fetch }).read(query, signal()),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('retries one transient read but not a permanent failure', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('private cause'))
      .mockResolvedValue(Response.json(payload));
    expect(
      (await createProgressBffClient({ fetch }).read(query, signal())).ok,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('bounds each attempt and returns cancellation without raw AbortError', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('private', 'AbortError')),
              { once: true },
            );
          }),
      );
      const client = createProgressBffClient({ fetch, requestTimeout: 20 });
      const timed = client.read(query, signal());
      await vi.advanceTimersByTimeAsync(60);
      expect(await timed).toEqual({ ok: false, error: { kind: 'timeout' } });
      expect(fetch).toHaveBeenCalledTimes(2);
      const abort = new AbortController();
      const cancelled = client.read(query, abort.signal);
      abort.abort();
      expect(await cancelled).toEqual({
        ok: false,
        error: { kind: 'request-cancelled' },
      });
    } finally {
      vi.useRealTimers();
    }
  });
  it('rejects invalid timeout configuration', () => {
    expect(() =>
      createProgressBffClient({ fetch: globalThis.fetch, requestTimeout: 0 }),
    ).toThrow(RangeError);
  });
  it('contains dependency defects before RTK serialization or logging', async () => {
    const diagnostic = 'PRIVATE_IMPLEMENTATION_SENTINEL';
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [progressApi.reducerPath]: progressApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: {
            extraArgument: {
              progressClient: {
                readQuestions: async () => ({
                  ok: true,
                  questions: { items: [], truncated: false },
                }),
                read: () => {
                  throw new Error(diagnostic);
                },
              },
            },
          },
        }).concat(progressApi.middleware),
    });
    try {
      const result = await store.dispatch(
        progressApi.endpoints.progress.initiate(query),
      );
      expect(result.error).toEqual({ kind: 'unexpected-defect' });
      expect(JSON.stringify(store.getState())).not.toContain(diagnostic);
      expect(log).not.toHaveBeenCalled();
    } finally {
      store.dispatch(progressApi.util.resetApiState());
      log.mockRestore();
    }
  });
});
