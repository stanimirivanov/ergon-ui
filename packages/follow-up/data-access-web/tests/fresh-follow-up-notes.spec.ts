// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  followUpNotesApi,
  useFreshFollowUpNotes,
  type FollowUpNotesClient,
} from '../src';

const query = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  workItemId: '22222222-2222-4222-8222-222222222222',
  claimId: '33333333-3333-4333-8333-333333333333',
  expectedOwnershipRevision: 1,
};
type Read = FollowUpNotesClient['listNotes'];
type Result = Awaited<ReturnType<Read>>;
const empty = { ok: true, notes: { items: [], truncated: false } } as const;
const stores: ReturnType<typeof createStore>[] = [];
function createStore(listNotes: Read) {
  return configureStore({
    reducer: { [followUpNotesApi.reducerPath]: followUpNotesApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: {
            followUpNotes: {
              listNotes,
              appendNote: async () => {
                throw new Error('Unexpected write');
              },
            },
          },
        },
      }).concat(followUpNotesApi.middleware),
  });
}
function setup(listNotes: Read) {
  const store = createStore(listNotes);
  stores.push(store);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(StrictMode, {}, createElement(Provider, { store, children }));
  return { store, wrapper };
}
afterEach(() => {
  for (const store of stores.splice(0))
    store.dispatch(followUpNotesApi.util.resetApiState());
});

describe('fresh private notes lifetime', () => {
  it('acquires only the committed StrictMode lifetime and hides retained history during failed refresh', async () => {
    const next = deferred<Result>();
    const listNotes = vi
      .fn<Read>()
      .mockResolvedValueOnce(empty)
      .mockImplementationOnce(() => next.promise);
    const { wrapper } = setup(listNotes);
    const hook = renderHook(() => useFreshFollowUpNotes(query), { wrapper });
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(listNotes).toHaveBeenCalledTimes(1);
    act(() => {
      if (hook.result.current.kind === 'ready') hook.result.current.refresh();
    });
    expect(hook.result.current.kind).toBe('pending');
    await waitFor(() => expect(listNotes).toHaveBeenCalledTimes(2));
    await act(async () =>
      next.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() => expect(hook.result.current.kind).toBe('failure'));
    expect(hook.result.current).not.toHaveProperty('notes');
    hook.unmount();
  });
  it('does not adopt a pre-close pending result as a reopened access gate', async () => {
    const old = deferred<Result>();
    const fresh = deferred<Result>();
    const listNotes = vi
      .fn<Read>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    const { store, wrapper } = setup(listNotes);
    const oldReader = store.dispatch(
      followUpNotesApi.endpoints.followUpNotes.initiate(query),
    );
    await waitFor(() => expect(listNotes).toHaveBeenCalledTimes(1));
    const first = renderHook(() => useFreshFollowUpNotes(query), { wrapper });
    first.unmount();
    const second = renderHook(() => useFreshFollowUpNotes(query), { wrapper });
    expect(listNotes).toHaveBeenCalledTimes(1);
    expect(listNotes.mock.calls[0]?.[1].aborted).toBe(false);
    await act(async () => old.resolve(empty));
    await waitFor(() => expect(listNotes).toHaveBeenCalledTimes(2));
    expect(second.result.current.kind).toBe('pending');
    await act(async () =>
      fresh.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await waitFor(() => expect(second.result.current.kind).toBe('failure'));
    oldReader.unsubscribe();
    second.unmount();
  });
  it('partitions different claim/revision tuples and retires obsolete completions', async () => {
    const old = deferred<Result>();
    const listNotes = vi
      .fn<Read>()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValue(empty);
    const { wrapper } = setup(listNotes);
    const hook = renderHook(({ current }) => useFreshFollowUpNotes(current), {
      wrapper,
      initialProps: { current: query },
    });
    await waitFor(() => expect(listNotes).toHaveBeenCalledTimes(1));
    const replacement = {
      ...query,
      claimId: '44444444-4444-4444-8444-444444444444',
      expectedOwnershipRevision: 3,
    };
    hook.rerender({ current: replacement });
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(listNotes.mock.calls[1]?.[0]).toEqual(replacement);
    await act(async () =>
      old.resolve({ ok: false, error: { kind: 'forbidden' } }),
    );
    expect(hook.result.current.kind).toBe('ready');
    hook.unmount();
  });
});

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
