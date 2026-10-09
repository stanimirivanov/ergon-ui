import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runSupervisionApi,
  type RunSupervisionClient,
  type RunSupervisionDependencies,
} from '../src';
import {
  OTHER_RUN_ID,
  RUN_ID,
  TENANT_ID,
  validConsole,
  validPage,
} from './run-supervision-fixtures';

const OTHER_TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const query = { tenantId: TENANT_ID, runId: RUN_ID };

afterEach(() => vi.useRealTimers());

describe('assigned-run remote cache', () => {
  it('deduplicates the exact tenant/run key and isolates another run and tenant', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementation(async (request) => ({
        ok: true,
        console: { ...validConsole(), runId: request.runId },
      }));
    const store = createStore({ ...client(), getConsole });
    const first = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );
    const duplicate = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );
    const otherRun = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate({
        ...query,
        runId: OTHER_RUN_ID,
      }),
    );
    const otherTenant = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate({
        ...query,
        tenantId: OTHER_TENANT_ID,
      }),
    );
    await Promise.all([
      first.unwrap(),
      duplicate.unwrap(),
      otherRun.unwrap(),
      otherTenant.unwrap(),
    ]);
    expect(getConsole).toHaveBeenCalledTimes(3);
    expect(getConsole.mock.calls.map(([request]) => request)).toEqual([
      query,
      { ...query, runId: OTHER_RUN_ID },
      { ...query, tenantId: OTHER_TENANT_ID },
    ]);
    first.unsubscribe();
    duplicate.unsubscribe();
    otherRun.unsubscribe();
    otherTenant.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('keeps independent cursor pages and tenants distinct', async () => {
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValue({ ok: true, page: validPage() });
    const store = createStore({ ...client(), listAssigned });
    const firstQuery = { tenantId: TENANT_ID, limit: 20 };
    const nextQuery = {
      ...firstQuery,
      cursor: {
        assignedAt: '2026-10-01T09:00:00Z',
        assignmentId: OTHER_RUN_ID,
      },
    };
    const first = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate(firstQuery),
    );
    const duplicate = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate(firstQuery),
    );
    const next = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate(nextQuery),
    );
    const otherTenant = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate({
        ...firstQuery,
        tenantId: OTHER_TENANT_ID,
      }),
    );
    await Promise.all([
      first.unwrap(),
      duplicate.unwrap(),
      next.unwrap(),
      otherTenant.unwrap(),
    ]);
    expect(listAssigned).toHaveBeenCalledTimes(3);
    first.unsubscribe();
    duplicate.unsubscribe();
    next.unsubscribe();
    otherTenant.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('evicts private detail and discovery after their final readers leave', async () => {
    vi.useFakeTimers();
    const store = createStore(client());
    const listQuery = { tenantId: TENANT_ID };
    const list = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate(listQuery),
    );
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );
    await Promise.all([list.unwrap(), detail.unwrap()]);
    expect(
      runSupervisionApi.endpoints.getAssignedRunConsole.select(query)(
        store.getState(),
      ).data,
    ).toEqual(validConsole());
    list.unsubscribe();
    detail.unsubscribe();
    await vi.advanceTimersByTimeAsync(1);
    expect(
      runSupervisionApi.endpoints.getAssignedRunConsole.select(query)(
        store.getState(),
      ).data,
    ).toBeUndefined();
    expect(
      runSupervisionApi.endpoints.listAssignedRuns.select(listQuery)(
        store.getState(),
      ).data,
    ).toBeUndefined();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('does not persist stale snapshots as a successful recheck after non-disclosing absence', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: validConsole() })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'not-found' } });
    const store = createStore({ ...client(), getConsole });
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );
    await detail.unwrap();
    await expect(detail.refetch().unwrap()).rejects.toEqual({
      kind: 'not-found',
    });
    const state = runSupervisionApi.endpoints.getAssignedRunConsole.select(
      query,
    )(store.getState());
    expect(state.isError).toBe(true);
    // RTK retains old data on failed revalidation; the feature must gate on
    // request state rather than treating this retained object as fresh authority.
    expect(state.data).toEqual(validConsole());
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('passes RTK request cancellation to the client', async () => {
    let receivedSignal: AbortSignal | undefined;
    let signalStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementation((_query, signal) => {
        receivedSignal = signal;
        signalStarted?.();
        return new Promise((resolve) => {
          signal.addEventListener(
            'abort',
            () => resolve({ ok: false, error: { kind: 'request-cancelled' } }),
            { once: true },
          );
        });
      });
    const store = createStore({ ...client(), getConsole });
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );
    await started;
    detail.abort();
    await expect(detail.unwrap()).rejects.toMatchObject({ name: 'AbortError' });
    expect(receivedSignal?.aborted).toBe(true);
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });
});

function client(): RunSupervisionClient {
  return {
    listAssigned: async () => ({ ok: true, page: validPage() }),
    getConsole: async () => ({ ok: true, console: validConsole() }),
  };
}

function createStore(runSupervision: RunSupervisionClient) {
  const dependencies: RunSupervisionDependencies = { runSupervision };
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: dependencies } }).concat(
        runSupervisionApi.middleware,
      ),
  });
}
