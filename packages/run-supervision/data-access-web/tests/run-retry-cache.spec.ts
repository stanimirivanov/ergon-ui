// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runRetryApi,
  runSupervisionApi,
  useRunRetryReview,
  type RunRetryClient,
  type RunRetryReviewQuery,
  type RunRetryReviewResult,
} from '../src';
import {
  retryCommand,
  retryQuery,
  retryReceipt,
  retryReview,
} from './run-retry-fixtures';

const stores: ReturnType<typeof buildStore>[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
  vi.restoreAllMocks();
});

describe('retry cache ownership and defect containment', () => {
  it('retires one subscriber without aborting another and never discloses a pre-close pending review on reopening', async () => {
    const old = deferred<RunRetryReviewResult>();
    const fresh = deferred<RunRetryReviewResult>();
    const read = vi
      .fn<RunRetryClient['getRetryReview']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = buildStore({ getRetryReview: read, retryRun: vi.fn() });
    stores.push(store);
    const view = renderHook<
      ReturnType<typeof useRunRetryReview>,
      { current: RunRetryReviewQuery | null }
    >(({ current }) => useRunRetryReview(current), {
      initialProps: { current: retryQuery },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(
          StrictMode,
          null,
          createElement(Provider, { store, children }),
        ),
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runRetryApi.endpoints.getRunRetryReview.initiate(retryQuery),
    );
    view.rerender({ current: null });
    view.rerender({ current: retryQuery });
    expect(view.result.current.phase).toBe('pending');
    expect(read.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () => {
      old.resolve({ ok: true, review: retryReview });
      await shared;
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(view.result.current.phase).toBe('pending');
    expect('data' in view.result.current).toBe(false);
    await act(async () => {
      fresh.resolve({ ok: false, error: { kind: 'not-found' } });
    });
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    expect('data' in view.result.current).toBe(false);
    shared.unsubscribe();
  });
  it('hides a retained review during held revalidation and keys a new epoch independently', async () => {
    const denied = deferred<RunRetryReviewResult>();
    const read = vi
      .fn<RunRetryClient['getRetryReview']>()
      .mockResolvedValueOnce({ ok: true, review: retryReview })
      .mockImplementationOnce(() => denied.promise)
      .mockResolvedValueOnce({
        ok: true,
        review: { ...retryReview, supervisionRevision: 4 },
      });
    const store = buildStore({ getRetryReview: read, retryRun: vi.fn() });
    stores.push(store);
    const view = renderHook(({ current }) => useRunRetryReview(current), {
      initialProps: { current: retryQuery },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(Provider, { store, children }),
    });
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    act(() => view.result.current.recheck());
    expect(view.result.current.phase).toBe('pending');
    expect('data' in view.result.current).toBe(false);
    await act(async () => {
      denied.resolve({ ok: false, error: { kind: 'not-found' } });
    });
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    view.rerender({
      current: { ...retryQuery, expectedSupervisionRevision: 4 },
    });
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'ready',
        data: { supervisionRevision: 4 },
      }),
    );
    expect(read.mock.calls[2]?.[0].expectedSupervisionRevision).toBe(4);
  });
  it('contains rejected clients and malformed bindings before RTK can serialize or log causes', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const sentinel = new Error('PRIVATE_RETRY_DEFECT');
    const client: RunRetryClient = {
      getRetryReview: async () => {
        throw sentinel;
      },
      retryRun: async () => {
        throw sentinel;
      },
    };
    const store = buildStore(client);
    stores.push(store);
    const read = store.dispatch(
      runRetryApi.endpoints.getRunRetryReview.initiate(retryQuery),
    );
    expect((await read).error).toEqual({ kind: 'unexpected-defect' });
    const write = store.dispatch(
      runRetryApi.endpoints.retryFailedRun.initiate(retryCommand),
    );
    expect((await write).error).toEqual({ kind: 'unexpected-defect' });
    expect(JSON.stringify(store.getState())).not.toContain(
      'PRIVATE_RETRY_DEFECT',
    );
    expect(log).not.toHaveBeenCalled();
    read.unsubscribe();
    write.reset();
    const missing = buildStore();
    stores.push(missing);
    const request = missing.dispatch(
      runRetryApi.endpoints.retryFailedRun.initiate(retryCommand),
    );
    expect((await request).error).toEqual({ kind: 'unexpected-defect' });
    request.reset();
  });
  it('normalizes failure extras and invalidates active private review even after an uncertain command', async () => {
    const read = vi
      .fn<RunRetryClient['getRetryReview']>()
      .mockResolvedValue({ ok: true, review: retryReview });
    const store = buildStore({
      getRetryReview: read,
      retryRun: async () => ({
        ok: false,
        error: { kind: 'transport', privateCause: 'PRIVATE' },
      }),
    });
    stores.push(store);
    const request = store.dispatch(
      runRetryApi.endpoints.getRunRetryReview.initiate(retryQuery),
    );
    await request;
    const write = store.dispatch(
      runRetryApi.endpoints.retryFailedRun.initiate(retryCommand),
    );
    expect((await write).error).toEqual({ kind: 'transport' });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(store.getState())).not.toContain('PRIVATE');
    request.unsubscribe();
    write.reset();
  });
  it('returns only sanitized acknowledgement data', async () => {
    const store = buildStore({
      getRetryReview: vi.fn(),
      retryRun: async () => ({ ok: true, receipt: retryReceipt }),
    });
    stores.push(store);
    const request = store.dispatch(
      runRetryApi.endpoints.retryFailedRun.initiate(retryCommand),
    );
    expect((await request).data).toEqual(retryReceipt);
    request.reset();
  });
});

function buildStore(client?: RunRetryClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: {
            runSupervision: {
              listAssigned: vi.fn(),
              getConsole: vi.fn(),
              ...client,
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
