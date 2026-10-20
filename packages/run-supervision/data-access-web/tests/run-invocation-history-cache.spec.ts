// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runInvocationHistoryApi,
  runSupervisionApi,
  useRunInvocationHistory,
  type RunInvocationHistoryClient,
  type RunInvocationHistoryQuery,
  type RunInvocationHistoryResult,
} from '../src';
import { RUN_ID, TENANT_ID } from './run-supervision-fixtures';

const query: RunInvocationHistoryQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
};
const value = {
  observedAt: '2026-10-20T08:00:00Z',
  supervisionRevision: 3,
  entries: [],
  truncated: false,
};
const stores: ReturnType<typeof buildStore>[] = [];
afterEach(() => {
  cleanup();
  stores.forEach((store) =>
    store.dispatch(runSupervisionApi.util.resetApiState()),
  );
  stores.length = 0;
  vi.restoreAllMocks();
});

describe('private gateway history cache lifetime', () => {
  it('retires only one subscriber and waits for a distinct fresh read after a pre-close pending request', async () => {
    const old = deferred<RunInvocationHistoryResult>(),
      fresh = deferred<RunInvocationHistoryResult>();
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook(
      ({ current }: { current: RunInvocationHistoryQuery | null }) =>
        useRunInvocationHistory(current),
      {
        initialProps: { current: query as RunInvocationHistoryQuery | null },
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(Provider, { store, children }),
      },
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runInvocationHistoryApi.endpoints.getInvocationHistory.initiate(query),
    );
    view.rerender({ current: null });
    expect(view.result.current.phase).toBe('closed');
    view.rerender({ current: query });
    expect(view.result.current.phase).toBe('pending');
    expect(read.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () => {
      old.resolve({ ok: true, value });
      await shared;
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect('data' in view.result.current).toBe(false);
    await act(async () =>
      fresh.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    expect('data' in view.result.current).toBe(false);
    shared.unsubscribe();
  });
  it('hides retained data during recheck and separates source epochs in StrictMode', async () => {
    const held = deferred<RunInvocationHistoryResult>();
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
      .mockResolvedValueOnce({ ok: true, value })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({
        ok: true,
        value: { ...value, supervisionRevision: 4 },
      });
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook(({ current }) => useRunInvocationHistory(current), {
      initialProps: { current: query },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(
          StrictMode,
          null,
          createElement(Provider, { store, children }),
        ),
    });
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    act(() => view.result.current.recheck());
    expect('data' in view.result.current).toBe(false);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      held.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    view.rerender({ current: { ...query, expectedSupervisionRevision: 4 } });
    expect('data' in view.result.current).toBe(false);
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'ready',
        data: { supervisionRevision: 4 },
      }),
    );
  });
  it('contains missing bindings, rejected clients and private diagnostics before serialization or logging', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const read of [
      undefined,
      vi
        .fn<RunInvocationHistoryClient['getInvocationHistory']>()
        .mockRejectedValue(new Error('PRIVATE_GATEWAY_CAUSE')),
    ]) {
      const store = buildStore(read);
      stores.push(store);
      const result = await store.dispatch(
        runInvocationHistoryApi.endpoints.getInvocationHistory.initiate(query),
      );
      expect(result.error).toEqual({ kind: 'unexpected-defect' });
      expect(JSON.stringify(store.getState())).not.toContain(
        'PRIVATE_GATEWAY_CAUSE',
      );
    }
    expect(log).not.toHaveBeenCalled();
  });
});

function buildStore(
  read: RunInvocationHistoryClient['getInvocationHistory'] | undefined,
) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: {
            runSupervision: {
              listAssigned: vi.fn(),
              getConsole: vi.fn(),
              ...(read ? { getInvocationHistory: read } : {}),
            },
          },
        },
      }).concat(runSupervisionApi.middleware),
  });
}
function deferred<A>(): { promise: Promise<A>; resolve: (value: A) => void } {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
