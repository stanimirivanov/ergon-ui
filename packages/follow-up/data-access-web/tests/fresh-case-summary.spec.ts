// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import {
  humanFollowUpApi,
  useFreshResolverFollowUpCaseSummary,
  type GetOwnedFollowUpCaseSummary,
  type HumanFollowUpCacheDependencies,
  type ResolverFollowUpCaseSummaryResult,
} from '../src';
import {
  CASE_ID,
  RUN_ID,
  TENANT_ID,
  WORK_ITEM_ID,
  validCaseSummary,
} from './follow-up-fixtures';

const query = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  caseId: CASE_ID,
  runId: RUN_ID,
};

describe('fresh owned case-summary disclosure', () => {
  it('acquires only the committed StrictMode lifetime', async () => {
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({ ok: true, summary: validCaseSummary() });
    const store = cacheStore(getOwnedCaseSummary);
    const { result } = renderHook(
      () => useFreshResolverFollowUpCaseSummary(query),
      {
        wrapper: ({ children }) =>
          createElement(
            StrictMode,
            {},
            createElement(Provider, { store, children }),
          ),
      },
    );
    await waitFor(() => expect(result.current.kind).toBe('ready'));
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1);
  });

  it('immediate pending close/reopen performs a distinct gate and ignores late completion', async () => {
    const first = deferred<ResolverFollowUpCaseSummaryResult>();
    const second = deferred<ResolverFollowUpCaseSummaryResult>();
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const store = cacheStore(getOwnedCaseSummary);
    const wrapper = provider(store);
    const old = renderHook(() => useFreshResolverFollowUpCaseSummary(query), {
      wrapper,
    });
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1));
    const retiredSignal = getOwnedCaseSummary.mock.calls[0]?.[1];
    old.unmount();
    const reopened = renderHook(
      () => useFreshResolverFollowUpCaseSummary(query),
      { wrapper },
    );
    expect(reopened.result.current.kind).toBe('pending');
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(retiredSignal?.aborted).toBe(true);
    await act(async () =>
      second.resolve({ ok: true, summary: validCaseSummary() }),
    );
    await waitFor(() => expect(reopened.result.current.kind).toBe('ready'));
    await act(async () =>
      first.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    expect(reopened.result.current.kind).toBe('ready');
  });

  it('detaching one disclosure never aborts an active exact-key reader', async () => {
    const held = deferred<ResolverFollowUpCaseSummaryResult>();
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockImplementation(() => held.promise);
    const store = cacheStore(getOwnedCaseSummary);
    const hook = renderHook(() => useFreshResolverFollowUpCaseSummary(query), {
      wrapper: provider(store),
    });
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate(query),
    );
    hook.unmount();
    await act(async () =>
      held.resolve({ ok: true, summary: validCaseSummary() }),
    );
    await expect(shared.unwrap()).resolves.toEqual(validCaseSummary());
    expect(getOwnedCaseSummary.mock.calls[0]?.[1].aborted).toBe(false);
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1);
    shared.unsubscribe();
  });

  it('waits for a shared pending gate and requests a fresh gate rather than consuming it', async () => {
    const held = deferred<ResolverFollowUpCaseSummaryResult>();
    const fresh = deferred<ResolverFollowUpCaseSummaryResult>();
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockImplementationOnce(() => held.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = cacheStore(getOwnedCaseSummary);
    const shared = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate(query),
    );
    const hook = renderHook(() => useFreshResolverFollowUpCaseSummary(query), {
      wrapper: provider(store),
    });
    expect(hook.result.current.kind).toBe('pending');
    await act(async () =>
      held.resolve({ ok: true, summary: validCaseSummary() }),
    );
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(hook.result.current.kind).toBe('pending');
    expect(getOwnedCaseSummary.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () =>
      fresh.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() =>
      expect(hook.result.current).toMatchObject({
        kind: 'failure',
        failure: { kind: 'not-found' },
      }),
    );
    shared.unsubscribe();
  });

  it('tracks later shared-reader revalidation without retaining evidence or freezing its original request ID', async () => {
    const held = deferred<ResolverFollowUpCaseSummaryResult>();
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValueOnce({ ok: true, summary: validCaseSummary() })
      .mockImplementationOnce(() => held.promise);
    const store = cacheStore(getOwnedCaseSummary);
    const hook = renderHook(() => useFreshResolverFollowUpCaseSummary(query), {
      wrapper: provider(store),
    });
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    const shared = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate(query),
    );
    act(() => {
      shared.refetch();
    });
    await waitFor(() => expect(hook.result.current.kind).toBe('pending'));
    await act(async () =>
      held.resolve({ ok: true, summary: validCaseSummary() }),
    );
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    shared.unsubscribe();
  });

  it('hides failed retained data and makes explicit retry a new committed gate', async () => {
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({ ok: true, summary: validCaseSummary() });
    const store = cacheStore(getOwnedCaseSummary);
    const hook = renderHook(() => useFreshResolverFollowUpCaseSummary(query), {
      wrapper: provider(store),
    });
    await waitFor(() => expect(hook.result.current.kind).toBe('failure'));
    act(() => {
      if (hook.result.current.kind === 'failure') hook.result.current.retry();
    });
    expect(hook.result.current.kind).toBe('pending');
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2);
  });

  it('retires an old tenant gate before publishing the replacement query', async () => {
    const old = deferred<ResolverFollowUpCaseSummaryResult>();
    const replacement = { ...validCaseSummary(), observations: [] };
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce({ ok: true, summary: replacement });
    const store = cacheStore(getOwnedCaseSummary);
    const hook = renderHook(
      (request) => useFreshResolverFollowUpCaseSummary(request),
      {
        initialProps: query,
        wrapper: provider(store),
      },
    );
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1));
    hook.rerender({
      ...query,
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    expect(hook.result.current.kind).toBe('pending');
    await waitFor(() =>
      expect(hook.result.current).toEqual({
        kind: 'ready',
        summary: replacement,
      }),
    );
    await act(async () =>
      old.resolve({ ok: true, summary: validCaseSummary() }),
    );
    expect(hook.result.current).toEqual({
      kind: 'ready',
      summary: replacement,
    });
    expect(getOwnedCaseSummary.mock.calls[1]?.[0].tenantId).toBe(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });
});

function cacheStore(
  getOwnedCaseSummary: GetOwnedFollowUpCaseSummary['getOwnedCaseSummary'],
) {
  const unused = async (): Promise<never> => {
    throw new Error('Unconfigured test capability');
  };
  const dependencies: HumanFollowUpCacheDependencies = {
    getOwnedFollowUpCaseSummary: { getOwnedCaseSummary },
    listOpenHumanFollowUps: { listOpen: unused },
    listOwnedHumanFollowUps: { listOwned: unused },
    claimHumanFollowUp: { claim: unused },
    releaseHumanFollowUp: { release: unused },
  };
  return configureStore({
    reducer: { humanFollowUpApi: humanFollowUpApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: dependencies } }).concat(
        humanFollowUpApi.middleware,
      ),
  });
}

function provider(store: ReturnType<typeof cacheStore>) {
  return ({ children }: { readonly children: ReactNode }) =>
    createElement(Provider, { store, children });
}

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
