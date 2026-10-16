// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runExecutionApi,
  runSupervisionApi,
  useRunExecutionReview,
  type RunExecutionClient,
  type RunExecutionReviewQuery,
  type RunExecutionReviewResult,
} from '../src';
import { RUN_ID, TENANT_ID } from './run-supervision-fixtures';

const query: RunExecutionReviewQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  expectedRunVersion: 0,
};
const observed = {
  supported: true,
  observedAt: '2026-10-16T08:00:00Z',
  supervisionRevision: 3,
  runVersion: 0,
  requestId: null,
  decisionId: null,
  commandId: null,
  canExecute: false,
  canResume: false,
};
const stores: ReturnType<typeof buildStore>[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
});

describe('execution review disclosure', () => {
  it('retires one review reader without aborting another and waits for old pending work before fresh reopening', async () => {
    const old = deferred<RunExecutionReviewResult>();
    const fresh = deferred<RunExecutionReviewResult>();
    const read = vi
      .fn<RunExecutionClient['getExecutionReview']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook<
      ReturnType<typeof useRunExecutionReview>,
      { current: RunExecutionReviewQuery | null }
    >(
      ({ current }: { current: RunExecutionReviewQuery | null }) =>
        useRunExecutionReview(current),
      {
        initialProps: { current: query },
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(Provider, { store, children }),
      },
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runExecutionApi.endpoints.getRunExecutionReview.initiate(query),
    );
    view.rerender({ current: null });
    view.rerender({ current: query });
    expect(view.result.current.phase).toBe('pending');
    expect(read.mock.calls[0]?.[1].aborted).toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () => {
      old.resolve({ ok: true, review: observed });
      await shared;
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(view.result.current.phase).toBe('pending');
    await act(async () => {
      fresh.resolve({ ok: true, review: { ...observed, supported: false } });
    });
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(view.result.current).toMatchObject({ data: { supported: false } });
    shared.unsubscribe();
  });
  it('keys expected epochs separately, hides revalidation and never discloses a failed retained review under StrictMode', async () => {
    const denied = deferred<RunExecutionReviewResult>();
    const read = vi
      .fn<RunExecutionClient['getExecutionReview']>()
      .mockResolvedValueOnce({ ok: true, review: observed })
      .mockImplementationOnce(() => denied.promise)
      .mockResolvedValueOnce({
        ok: true,
        review: { ...observed, supervisionRevision: 4 },
      });
    const store = buildStore(read);
    stores.push(store);
    const view = renderHook(({ current }) => useRunExecutionReview(current), {
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
    await act(async () => {
      denied.resolve({ ok: false, error: { kind: 'not-found' } });
    });
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    expect('data' in view.result.current).toBe(false);
    view.rerender({ current: { ...query, expectedSupervisionRevision: 4 } });
    expect(view.result.current.phase).toBe('pending');
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'ready',
        data: { supervisionRevision: 4 },
      }),
    );
    expect(read.mock.calls[2]?.[0]).toEqual({
      ...query,
      expectedSupervisionRevision: 4,
    });
  });
});

function buildStore(read: RunExecutionClient['getExecutionReview']) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: {
            runSupervision: {
              listAssigned: vi.fn(),
              getConsole: vi.fn(),
              getExecutionReview: read,
              submitExecution: vi.fn(),
            },
          },
        },
      }).concat(runSupervisionApi.middleware),
  });
}
function deferred<A>() {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
