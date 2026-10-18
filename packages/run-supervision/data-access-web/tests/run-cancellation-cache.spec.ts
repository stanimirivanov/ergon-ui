// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runCancellationApi,
  runSupervisionApi,
  useRunCancellationReview,
  type RunCancellationClient,
  type RunCancellationReviewQuery,
  type RunCancellationReviewResult,
} from '../src';
import {
  cancellationCommand,
  cancellationQuery,
  cancellationReceipt,
  cancellationReview,
} from './run-cancellation-fixtures';

const stores: ReturnType<typeof buildStore>[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
  vi.restoreAllMocks();
});

describe('cancellation cache ownership and defect containment', () => {
  it('retires one subscriber without aborting another and never discloses a pre-close pending review on reopening', async () => {
    const old = deferred<RunCancellationReviewResult>();
    const fresh = deferred<RunCancellationReviewResult>();
    const read = vi
      .fn<RunCancellationClient['getCancellationReview']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = buildStore({
      getCancellationReview: read,
      cancelRun: vi.fn(),
    });
    stores.push(store);
    const view = renderHook<
      ReturnType<typeof useRunCancellationReview>,
      { current: RunCancellationReviewQuery | null }
    >(({ current }) => useRunCancellationReview(current), {
      initialProps: { current: cancellationQuery },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(
          StrictMode,
          null,
          createElement(Provider, { store, children }),
        ),
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runCancellationApi.endpoints.getRunCancellationReview.initiate(
        cancellationQuery,
      ),
    );
    view.rerender({ current: null });
    view.rerender({ current: cancellationQuery });
    expect(view.result.current.phase).toBe('pending');
    expect(read.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () => {
      old.resolve({ ok: true, review: cancellationReview });
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
    const denied = deferred<RunCancellationReviewResult>();
    const read = vi
      .fn<RunCancellationClient['getCancellationReview']>()
      .mockResolvedValueOnce({ ok: true, review: cancellationReview })
      .mockImplementationOnce(() => denied.promise)
      .mockResolvedValueOnce({
        ok: true,
        review: { ...cancellationReview, supervisionRevision: 4 },
      });
    const store = buildStore({
      getCancellationReview: read,
      cancelRun: vi.fn(),
    });
    stores.push(store);
    const view = renderHook(
      ({ current }) => useRunCancellationReview(current),
      {
        initialProps: { current: cancellationQuery },
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(Provider, { store, children }),
      },
    );
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    act(() => view.result.current.recheck());
    expect(view.result.current.phase).toBe('pending');
    expect('data' in view.result.current).toBe(false);
    await act(async () => {
      denied.resolve({ ok: false, error: { kind: 'not-found' } });
    });
    await waitFor(() => expect(view.result.current.phase).toBe('failed'));
    view.rerender({
      current: { ...cancellationQuery, expectedSupervisionRevision: 4 },
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
    const sentinel = new Error('PRIVATE_ESCALATION_DEFECT');
    const client: RunCancellationClient = {
      getCancellationReview: async () => {
        throw sentinel;
      },
      cancelRun: async () => {
        throw sentinel;
      },
    };
    const store = buildStore(client);
    stores.push(store);
    const read = store.dispatch(
      runCancellationApi.endpoints.getRunCancellationReview.initiate(
        cancellationQuery,
      ),
    );
    expect((await read).error).toEqual({ kind: 'unexpected-defect' });
    const write = store.dispatch(
      runCancellationApi.endpoints.cancelUntouchedRun.initiate(
        cancellationCommand,
      ),
    );
    expect((await write).error).toEqual({ kind: 'unexpected-defect' });
    expect(JSON.stringify(store.getState())).not.toContain(
      'PRIVATE_ESCALATION_DEFECT',
    );
    expect(log).not.toHaveBeenCalled();
    read.unsubscribe();
    write.reset();
    const missing = buildStore();
    stores.push(missing);
    const request = missing.dispatch(
      runCancellationApi.endpoints.cancelUntouchedRun.initiate(
        cancellationCommand,
      ),
    );
    expect((await request).error).toEqual({ kind: 'unexpected-defect' });
    request.reset();
  });
  it('normalizes failure extras and invalidates active private review even after an uncertain command', async () => {
    const read = vi
      .fn<RunCancellationClient['getCancellationReview']>()
      .mockResolvedValue({ ok: true, review: cancellationReview });
    const store = buildStore({
      getCancellationReview: read,
      cancelRun: async () => ({
        ok: false,
        error: { kind: 'transport', privateCause: 'PRIVATE' },
      }),
    });
    stores.push(store);
    const request = store.dispatch(
      runCancellationApi.endpoints.getRunCancellationReview.initiate(
        cancellationQuery,
      ),
    );
    await request;
    const write = store.dispatch(
      runCancellationApi.endpoints.cancelUntouchedRun.initiate(
        cancellationCommand,
      ),
    );
    expect((await write).error).toEqual({ kind: 'transport' });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(store.getState())).not.toContain('PRIVATE');
    request.unsubscribe();
    write.reset();
  });
  it('returns only sanitized acknowledgement data', async () => {
    const store = buildStore({
      getCancellationReview: vi.fn(),
      cancelRun: async () => ({ ok: true, receipt: cancellationReceipt }),
    });
    stores.push(store);
    const request = store.dispatch(
      runCancellationApi.endpoints.cancelUntouchedRun.initiate(
        cancellationCommand,
      ),
    );
    expect((await request).data).toEqual(cancellationReceipt);
    request.reset();
  });
});

function buildStore(client?: RunCancellationClient) {
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
