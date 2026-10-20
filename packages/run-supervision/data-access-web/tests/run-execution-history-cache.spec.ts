// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runExecutionHistoryApi,
  runSupervisionApi,
  useRunExecutionHistory,
  type RunExecutionHistoryClient,
  type RunExecutionHistoryQuery,
  type RunExecutionHistoryResult,
} from '../src';
import { RUN_ID, TENANT_ID } from './run-supervision-fixtures';

const query: RunExecutionHistoryQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
};
const value = {
  observedAt: '2026-10-19T08:00:00Z',
  supervisionRevision: 3,
  commandRecorded: false,
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
});

describe('private execution history lifecycle', () => {
  it('retires only this subscriber, never discloses pre-close pending data and reacquires after it settles', async () => {
    const old = deferred<RunExecutionHistoryResult>(),
      fresh = deferred<RunExecutionHistoryResult>();
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook(
      ({ current }: { current: RunExecutionHistoryQuery | null }) =>
        useRunExecutionHistory(current),
      {
        initialProps: { current: query as RunExecutionHistoryQuery | null },
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(Provider, { store, children }),
      },
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runExecutionHistoryApi.endpoints.getExecutionHistory.initiate(query),
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
  it('hides retained history on recheck and separates epochs under StrictMode', async () => {
    const next = deferred<RunExecutionHistoryResult>();
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockResolvedValueOnce({ ok: true, value })
      .mockImplementationOnce(() => next.promise)
      .mockResolvedValueOnce({
        ok: true,
        value: { ...value, supervisionRevision: 4 },
      });
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook(({ current }) => useRunExecutionHistory(current), {
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
    expect(view.result.current.phase).toBe('pending');
    expect('data' in view.result.current).toBe(false);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      next.resolve({ ok: false, error: { kind: 'not-found' } }),
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
  it('contains thrown private causes before Redux can serialize or log them', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockRejectedValue(new Error('private diagnostic'));
    const store = buildStore(read);
    stores.push(store);
    const result = await store.dispatch(
      runExecutionHistoryApi.endpoints.getExecutionHistory.initiate(query),
    );
    expect(result.error).toEqual({ kind: 'unexpected-defect' });
    expect(JSON.stringify(store.getState())).not.toContain(
      'private diagnostic',
    );
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

function buildStore(read: RunExecutionHistoryClient['getExecutionHistory']) {
  const store = configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: {
            runSupervision: {
              listAssigned: vi.fn(),
              getConsole: vi.fn(),
              getExecutionHistory: read,
            },
          },
        },
      }).concat(runSupervisionApi.middleware),
  });
  return store;
}
function deferred<A>(): { promise: Promise<A>; resolve: (value: A) => void } {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
