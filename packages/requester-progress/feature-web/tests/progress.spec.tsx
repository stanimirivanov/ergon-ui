import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  progressApi,
  type ProgressClient,
  type ProgressResult,
} from '@ergon/requester-progress-data-access-web';
import { RequesterCaseProgress } from '../src/requester-progress';

const query = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
};
const progress = {
  ...query,
  goal: '<img src=x onerror=alert(1)>',
  status: 'OPEN' as const,
  openedAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
};
afterEach(cleanup);
function fixture(read: ProgressClient['read']) {
  const store = configureStore({
    reducer: { [progressApi.reducerPath]: progressApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { progressClient: { read } } },
      }).concat(progressApi.middleware),
  });
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <RequesterCaseProgress
          query={query}
          signInHref="/bff/login?returnTo=tenant"
        />
      </Provider>
    </StrictMode>,
  );
  return { store, ...view };
}
describe('requester progress disclosure', () => {
  it('hides before recheck I/O, keeps stable focus and never restores retained facts on failure', async () => {
    let finish: (value: ProgressResult) => void = () => undefined;
    const read = vi
      .fn<ProgressClient['read']>()
      .mockResolvedValueOnce({ ok: true, progress })
      .mockImplementationOnce(() => {
        expect(screen.queryByText(progress.goal)).toBeNull();
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
    const { store } = fixture(read);
    await screen.findByText(progress.goal);
    expect(document.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Case progress' }),
    );
    expect(screen.queryByText(progress.goal)).toBeNull();
    await act(async () => finish({ ok: false, error: { kind: 'not-found' } }));
    await screen.findByRole('heading', {
      name: 'Case progress is unavailable.',
    });
    expect(screen.queryByText(progress.goal)).toBeNull();
    store.dispatch(progressApi.util.resetApiState());
  });
  it('retires a pending lifetime and reacquires rather than using an obsolete response on reopen', async () => {
    let complete: (value: ProgressResult) => void = () => undefined;
    const read = vi
      .fn<ProgressClient['read']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      )
      .mockResolvedValue({ ok: false, error: { kind: 'not-found' } });
    const first = fixture(read);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    first.unmount();
    await act(async () => complete({ ok: true, progress }));
    const reopened = render(
      <Provider store={first.store}>
        <RequesterCaseProgress query={query} signInHref="/bff/login" />
      </Provider>,
    );
    expect(screen.queryByText(progress.goal)).toBeNull();
    await screen.findByRole('heading', {
      name: 'Case progress is unavailable.',
    });
    expect(read).toHaveBeenCalledTimes(2);
    reopened.unmount();
    first.store.dispatch(progressApi.util.resetApiState());
  });
});
