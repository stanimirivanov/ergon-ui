import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runControlApi } from '../src/cache/run-control-api';
import { runSupervisionApi } from '../src';
import type { RunControlView } from '../src/control-contracts';
import { TENANT_ID, RUN_ID } from './run-supervision-fixtures';

const query = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
};
const initial: RunControlView = {
  status: 'THIS_SESSION',
  supervisionRevision: 3,
  observedAt: '2026-10-19T08:00:00Z',
  expiresAt: '2026-10-19T08:02:00Z',
  fence: { leaseId: '77777777-7777-4777-8777-777777777777', revision: 1 },
};
afterEach(() => vi.restoreAllMocks());

function storeFor(
  getRunControl: () => Promise<{
    readonly ok: true;
    readonly value: RunControlView;
  }>,
) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: {
            runSupervision: {
              listAssigned: async () => ({
                ok: false,
                error: { kind: 'not-found' },
              }),
              getConsole: async () => ({
                ok: false,
                error: { kind: 'not-found' },
              }),
              getRunControl,
              changeRunControl: async () => ({
                ok: false,
                error: { kind: 'control-disabled' },
              }),
            },
          },
        },
      }).concat(runSupervisionApi.middleware),
  });
}

describe('control observation ownership', () => {
  it('keeps monotonic arrival in RTK, not React memo lifetime; fresh status does not extend an unchanged server expiry', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(500);
    let view = initial;
    const get = vi.fn(async () => ({ ok: true as const, value: view }));
    const store = storeFor(get);
    const first = store.dispatch(
      runControlApi.endpoints.getRunControl.initiate(query),
    );
    try {
      const data = await first.unwrap();
      expect(data.receivedAtMonotonic).toBe(500);
      clock.mockReturnValue(25_000);
      expect(
        runControlApi.endpoints.getRunControl.select(query)(store.getState())
          .data?.receivedAtMonotonic,
      ).toBe(500);
      expect(get).toHaveBeenCalledTimes(1);
      view = { ...initial, observedAt: '2026-10-19T08:00:24.500Z' };
      const fresh = store.dispatch(
        runControlApi.endpoints.getRunControl.initiate(query, {
          forceRefetch: true,
        }),
      );
      try {
        const updated = await fresh.unwrap();
        expect(updated.receivedAtMonotonic).toBe(25_000);
        if (!('expiresAt' in updated))
          throw new Error('Expected expiring lease');
        expect(
          updated.receivedAtMonotonic +
            Date.parse(updated.expiresAt) -
            Date.parse(updated.observedAt),
        ).toBe(120_500);
      } finally {
        fresh.unsubscribe();
      }
    } finally {
      first.unsubscribe();
      store.dispatch(runSupervisionApi.util.resetApiState());
    }
  });
  it('contains a rejected client without serializing or logging its private cause', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = storeFor(async () => {
      throw new Error('PRIVATE_CONTROL_SENTINEL');
    });
    const read = store.dispatch(
      runControlApi.endpoints.getRunControl.initiate(query),
    );
    try {
      expect(await read).toMatchObject({
        error: { kind: 'unexpected-defect' },
      });
      expect(JSON.stringify(store.getState())).not.toContain(
        'PRIVATE_CONTROL_SENTINEL',
      );
      expect(log).not.toHaveBeenCalled();
    } finally {
      read.unsubscribe();
      store.dispatch(runSupervisionApi.util.resetApiState());
    }
  });
});
