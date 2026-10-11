// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runSupervisionApi,
  useAssignedRunDisclosure,
  useAssignedRunDiscovery,
  type AssignedRunConsoleQuery,
  type AssignedRunConsoleResult,
  type AssignedRunListResult,
  type RunSupervisionClient,
} from '../src';
import {
  OTHER_RUN_ID,
  RUN_ID,
  TENANT_ID,
  validConsole,
  validPage,
} from './run-supervision-fixtures';

const query = { tenantId: TENANT_ID, runId: RUN_ID };
const stores: ReturnType<typeof createStore>[] = [];

afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
});

describe('assigned-run disclosure cache integration', () => {
  it('retires discovery without aborting another active pending reader', async () => {
    const held = deferred<AssignedRunListResult>();
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockImplementation(() => held.promise);
    const store = createStore(
      async () => ({ ok: true, console: validConsole() }),
      listAssigned,
    );
    stores.push(store);
    const view = renderHook(
      () => useAssignedRunDiscovery({ tenantId: TENANT_ID }),
      {
        wrapper: ({ children }: { readonly children: ReactNode }) =>
          createElement(Provider, { store, children }),
      },
    );
    await waitFor(() => expect(listAssigned).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runSupervisionApi.endpoints.listAssignedRuns.initiate({
        tenantId: TENANT_ID,
      }),
    );
    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(listAssigned.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () => {
      held.resolve({ ok: true, page: validPage() });
      expect(await shared.unwrap()).toEqual(validPage());
    });
    shared.unsubscribe();
  });

  it('leaves a shared pending request alive and waits for it before issuing the reopen gate', async () => {
    const old = deferred<AssignedRunConsoleResult>();
    const fresh = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const store = createStore(getConsole);
    const view = renderDisclosure(store);
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(1));
    const shared = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(query),
    );

    view.rerender({ query: null });
    view.rerender({ query });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getConsole.mock.calls[0]?.[1].aborted).toBe(false);
    expect(getConsole).toHaveBeenCalledTimes(1);
    expect(view.result.current.phase).toBe('pending');

    await act(async () => {
      old.resolve({ ok: true, console: validConsole() });
      expect(await shared.unwrap()).toEqual(validConsole());
    });
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    expect(view.result.current.phase).toBe('pending');
    await act(async () =>
      fresh.resolve({
        ok: true,
        console: { ...validConsole(), contractKey: 'fresh-gate' },
      }),
    );
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'ready',
        data: { contractKey: 'fresh-gate' },
      }),
    );
    shared.unsubscribe();
  });

  it('lets zero-grace eviction cancel the last pending reader before an immediate reopen', async () => {
    const old = deferred<AssignedRunConsoleResult>();
    const fresh = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const view = renderDisclosure(createStore(getConsole));
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(1));
    view.rerender({ query: null });
    view.rerender({ query });
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    expect(getConsole.mock.calls[0]?.[1].aborted).toBe(true);
    await act(async () => old.resolve({ ok: true, console: validConsole() }));
    expect(view.result.current.phase).toBe('pending');
    await act(async () =>
      fresh.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'failed',
        error: { kind: 'not-found' },
      }),
    );
  });

  it('cannot publish a retired identity completion into a replacement run gate', async () => {
    const old = deferred<AssignedRunConsoleResult>();
    const replacement = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => replacement.promise);
    const view = renderDisclosure(createStore(getConsole));
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(1));
    view.rerender({ query: { tenantId: TENANT_ID, runId: OTHER_RUN_ID } });
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    await act(async () => old.resolve({ ok: true, console: validConsole() }));
    expect(view.result.current.phase).toBe('pending');
    await act(async () =>
      replacement.resolve({
        ok: true,
        console: { ...validConsole(), runId: OTHER_RUN_ID },
      }),
    );
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        phase: 'ready',
        data: { runId: OTHER_RUN_ID },
      }),
    );
  });

  it('acquires exactly one usable initial request under StrictMode', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValue({ ok: true, console: validConsole() });
    const view = renderDisclosure(createStore(getConsole), true);
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(getConsole).toHaveBeenCalledTimes(1);
    expect(getConsole.mock.calls[0]?.[1].aborted).toBe(false);
  });
});

function createStore(
  getConsole: RunSupervisionClient['getConsole'],
  listAssigned: RunSupervisionClient['listAssigned'] = async () => ({
    ok: true,
    page: validPage(),
  }),
) {
  const store = configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            runSupervision: {
              getConsole,
              listAssigned,
            },
          },
        },
      }).concat(runSupervisionApi.middleware),
  });
  return store;
}

function renderDisclosure(
  store: ReturnType<typeof createStore>,
  strict = false,
) {
  stores.push(store);
  const wrapper = ({ children }: { readonly children: ReactNode }) => {
    const content = createElement(Provider, { store, children });
    return strict ? createElement(StrictMode, null, content) : content;
  };
  const initialProps: { readonly query: AssignedRunConsoleQuery | null } = {
    query,
  };
  return renderHook(
    ({ query }: { readonly query: AssignedRunConsoleQuery | null }) =>
      useAssignedRunDisclosure(query),
    { initialProps, wrapper },
  );
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => {
    throw new Error('Deferred promise was not initialized');
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
