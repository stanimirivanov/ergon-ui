// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import { useFreshFollowUpQuestions, type ListFollowUpQuestions } from '../src';
import { followUpQuestionsApi } from '../src/cache/follow-up-questions-api';

const query = {
  tenantId: 'tenant',
  workItemId: 'work',
  caseId: 'case',
  claimId: 'claim',
  expectedOwnershipRevision: 1,
};
const empty = { ok: true, questions: { items: [], truncated: false } } as const;
const resetStores: (() => void)[] = [];
function setup(listFollowUpQuestions: ListFollowUpQuestions) {
  const store = configureStore({
    reducer: {
      [followUpQuestionsApi.reducerPath]: followUpQuestionsApi.reducer,
    },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: { listFollowUpQuestions } } }).concat(
        followUpQuestionsApi.middleware,
      ),
  });
  resetStores.push(() => {
    store.dispatch(followUpQuestionsApi.util.resetApiState());
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(StrictMode, {}, createElement(Provider, { store, children }));
  return { store, wrapper };
}
afterEach(() => {
  for (const reset of resetStores.splice(0)) reset();
});

it('acquires one committed StrictMode observation and hides retained history before rechecking', async () => {
  const read = vi
    .fn<ListFollowUpQuestions>()
    .mockResolvedValueOnce(empty)
    .mockResolvedValueOnce({ ok: false, error: { kind: 'not-found' } });
  const { wrapper } = setup(read);
  const hook = renderHook(() => useFreshFollowUpQuestions(query), { wrapper });
  await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
  expect(read).toHaveBeenCalledTimes(1);
  act(() => {
    if (hook.result.current.kind === 'ready') hook.result.current.refresh();
  });
  expect(hook.result.current.kind).toBe('pending');
  await waitFor(() => expect(hook.result.current.kind).toBe('failure'));
  expect(hook.result.current).not.toHaveProperty('questions');
  hook.unmount();
});

it('cancels only its own pending read and never adopts it on immediate reopening or claim replacement', async () => {
  let finish:
    ((value: Awaited<ReturnType<ListFollowUpQuestions>>) => void) | undefined;
  const old = new Promise<Awaited<ReturnType<ListFollowUpQuestions>>>(
    (resolve) => {
      finish = resolve;
    },
  );
  const read = vi
    .fn<ListFollowUpQuestions>()
    .mockReturnValueOnce(old)
    .mockResolvedValue(empty);
  const { wrapper } = setup(read);
  const first = renderHook(() => useFreshFollowUpQuestions(query), { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  first.unmount();
  const second = renderHook(
    ({ claimId }) => useFreshFollowUpQuestions({ ...query, claimId }),
    { wrapper, initialProps: { claimId: 'claim' } },
  );
  await waitFor(() => expect(read.mock.calls[0]?.[1].aborted).toBe(true));
  await waitFor(() => expect(second.result.current.kind).toBe('ready'));
  second.rerender({ claimId: 'replacement' });
  expect(second.result.current.kind).toBe('pending');
  await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
  await act(async () => finish?.({ ok: false, error: { kind: 'forbidden' } }));
  await waitFor(() => expect(second.result.current.kind).toBe('ready'));
  second.unmount();
});

it('never aborts another simultaneously mounted observation', async () => {
  const read = vi
    .fn<ListFollowUpQuestions>()
    .mockImplementation(() => new Promise(() => undefined));
  const { wrapper } = setup(read);
  const first = renderHook(() => useFreshFollowUpQuestions(query), { wrapper });
  const second = renderHook(() => useFreshFollowUpQuestions(query), {
    wrapper,
  });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  first.unmount();
  await waitFor(() => expect(read.mock.calls[0]?.[1].aborted).toBe(true));
  expect(read.mock.calls[1]?.[1].aborted).toBe(false);
  second.unmount();
  await waitFor(() => expect(read.mock.calls[1]?.[1].aborted).toBe(true));
});

it('contains rejected clients without retaining or logging their private cause', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const { wrapper } = setup(async () => {
    throw new Error('private question');
  });
  const hook = renderHook(() => useFreshFollowUpQuestions(query), { wrapper });
  await waitFor(() =>
    expect(hook.result.current).toMatchObject({
      kind: 'failure',
      failure: { kind: 'unexpected-defect' },
    }),
  );
  expect(log).not.toHaveBeenCalled();
  hook.unmount();
  log.mockRestore();
});
