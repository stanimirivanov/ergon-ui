import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import {
  createNotificationClient,
  notificationApi,
  notificationKey,
  type NotificationQuery,
} from '../src';
import { parseNotificationPage } from '../src/notification-schema';

const tenantId = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const query: NotificationQuery = {
  tenantId,
  actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
  audience: 'resolver',
};
const item = {
  kind: 'FOLLOW_UP_HANDED_OVER' as const,
  sourceId: '11111111-1111-4111-8111-111111111111',
  target: {
    kind: 'OWNED_HUMAN_FOLLOW_UP' as const,
    id: '22222222-2222-4222-8222-222222222222',
  },
  deliveredAt: '2026-10-28T09:00:00.123456789Z',
};
const page = { items: [item], truncated: false };

describe('historical notification contract', () => {
  it('accepts an explicitly truncated latest-fifty snapshot without inventing a total', () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      ...item,
      sourceId: `00000000-0000-4000-8000-${(50 - index).toString(16).padStart(12, '0')}`,
    }));
    expect(
      parseNotificationPage({ items, truncated: true, total: 900 }, 'resolver'),
    ).toEqual({ items, truncated: true });
  });
  it('strips unsolicited private fields before caching and accepts work-scoped command identities', () => {
    const other = {
      ...item,
      target: { ...item.target, id: '11111111-1111-4111-8111-111111111111' },
    };
    const parsed = parseNotificationPage(
      {
        ...page,
        privateText: 'secret',
        items: [{ ...item, evidence: 'secret' }, other],
      },
      'resolver',
    );
    expect(parsed).toEqual({ items: [item, other], truncated: false });
    expect(notificationKey(item)).not.toBe(notificationKey(other));
  });
  it.each([
    { ...page, items: [item, item] },
    { ...page, truncated: true },
    { ...page, items: Array.from({ length: 51 }, () => item) },
    { ...page, items: [{ ...item, kind: 'INFORMATION_REQUESTED' }] },
    { ...page, items: [{ ...item, deliveredAt: '2026-02-30T09:00:00Z' }] },
    { ...page, items: [{ ...item, deliveredAt: '2026-10-28T09:00:00+01:00' }] },
    { ...page, items: [{ ...item, sourceId: 'bad' }] },
    {
      ...page,
      items: [{ ...item, target: { ...item.target, kind: 'REQUESTER_CASE' } }],
    },
  ])('rejects malformed, unbounded or contradictory pages %#', (body) => {
    expect(parseNotificationPage(body, 'resolver')).toBeUndefined();
  });
  it('retains nanosecond ordering and refuses another deployment audience', () => {
    const earlier = {
      ...item,
      sourceId: query.actorId,
      deliveredAt: '2026-10-28T09:00:00.123456788Z',
    };
    expect(
      parseNotificationPage({ ...page, items: [item, earlier] }, 'resolver'),
    ).toBeDefined();
    expect(
      parseNotificationPage({ ...page, items: [earlier, item] }, 'resolver'),
    ).toBeUndefined();
    expect(parseNotificationPage(page, 'requester')).toBeUndefined();
  });
});

describe('notification HTTP execution', () => {
  it('sends only a fixed same-origin GET; cache coordinates are never authority parameters', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(page));
    const result = await createNotificationClient({ fetch }).read(
      query,
      new AbortController().signal,
    );
    expect(result).toEqual({ ok: true, page });
    expect(fetch).toHaveBeenCalledWith(
      `/bff/v1/tenants/${tenantId}/notifications`,
      expect.objectContaining({
        credentials: 'same-origin',
        cache: 'no-store',
        method: 'GET',
      }),
    );
  });
  it.each([
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
        signInPath: 'https://evil.invalid',
      },
      'invalid-response',
    ],
    [403, {}, 'forbidden'],
    [503, {}, 'unavailable'],
    [404, {}, 'invalid-response'],
    [200, { secret: 'private' }, 'invalid-response'],
  ])(
    'contains HTTP %s without leaking problem details',
    async (status, body, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(body, { status }));
      expect(
        await createNotificationClient({ fetch }).read(
          query,
          new AbortController().signal,
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('aborts an unfinished response body on timeout without an automatic retry', async () => {
    let observed: AbortSignal | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_input, init) => {
        observed = init?.signal ?? undefined;
        return {
          status: 200,
          json: () => new Promise(() => undefined),
        } as unknown as Response;
      });
    expect(
      await createNotificationClient({ fetch, requestTimeout: 10 }).read(
        query,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(observed?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports cancellation even when fetch rejects first', async () => {
    const controller = new AbortController();
    const fetch: typeof globalThis.fetch = async () => {
      controller.abort();
      throw new DOMException('private reason', 'AbortError');
    };
    expect(
      await createNotificationClient({ fetch }).read(query, controller.signal),
    ).toEqual({ ok: false, error: { kind: 'request-cancelled' } });
  });
  it('contains injected defects and private fields before Redux can serialize them', async () => {
    const read = vi.fn().mockRejectedValue(new Error('private diagnostic'));
    const store = configureStore({
      reducer: { [notificationApi.reducerPath]: notificationApi.reducer },
      middleware: (defaults) =>
        defaults({
          thunk: { extraArgument: { notificationsClient: { read } } },
        }).concat(notificationApi.middleware),
    });
    const request = store.dispatch(
      notificationApi.endpoints.recent.initiate(query),
    );
    await expect(request.unwrap()).rejects.toEqual({
      kind: 'unexpected-defect',
    });
    expect(JSON.stringify(store.getState())).not.toContain(
      'private diagnostic',
    );
    request.unsubscribe();
    store.dispatch(notificationApi.util.resetApiState());
  });
});
