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
import { RequesterCanvas } from '../src/requester-canvas';

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
function fixture(
  read: ProgressClient['read'],
  readQuestions: ProgressClient['readQuestions'] = async () => ({
    ok: true,
    questions: { items: [], truncated: false },
  }),
) {
  const store = configureStore({
    reducer: { [progressApi.reducerPath]: progressApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { progressClient: { read, readQuestions } } },
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
  it('reacquires history on immediate reopen and cannot publish a retired answer', async () => {
    type Result = Awaited<ReturnType<ProgressClient['readQuestions']>>;
    let finish: (value: Result) => void = () => undefined;
    const readQuestions = vi
      .fn<ProgressClient['readQuestions']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ ok: false, error: { kind: 'not-found' } });
    const first = fixture(async () => ({ ok: true, progress }), readQuestions);
    await waitFor(() => expect(readQuestions).toHaveBeenCalledTimes(1));
    first.unmount();
    const reopened = render(
      <Provider store={first.store}>
        <RequesterCaseProgress query={query} signInHref="/bff/login" />
      </Provider>,
    );
    expect(screen.queryByText(progress.goal)).toBeNull();
    await act(async () =>
      finish({
        ok: true,
        questions: {
          items: [
            {
              requestId: 'retired-question',
              question: 'Retired question',
              requestedAt: progress.openedAt,
              recordedAt: progress.updatedAt,
              response: {
                responseId: 'retired-response',
                answer: 'RETIRED ANSWER',
                respondedAt: progress.openedAt,
                recordedAt: progress.updatedAt,
              },
            },
          ],
          truncated: false,
        },
      }),
    );
    await screen.findByText('Case progress is unavailable.');
    expect(readQuestions).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('RETIRED ANSWER')).toBeNull();
    expect(screen.queryByText(progress.goal)).toBeNull();
    reopened.unmount();
    first.store.dispatch(progressApi.util.resetApiState());
  });
  it('withholds the whole canvas until history succeeds and before a held failed history recheck', async () => {
    const question = {
      requestId: 'question',
      question: 'Exact <script>question</script>',
      requestedAt: progress.openedAt,
      recordedAt: progress.updatedAt,
      response: {
        responseId: 'answer',
        answer: ' Exact 😀 <script>answer</script>\n',
        respondedAt: '2026-10-25T00:00:02.123456789Z',
        recordedAt: '2026-10-25T00:00:03Z',
      },
    };
    type Result = Awaited<ReturnType<ProgressClient['readQuestions']>>;
    let finish: (value: Result) => void = () => undefined;
    const readQuestions = vi
      .fn<ProgressClient['readQuestions']>()
      .mockImplementation(() => {
        expect(screen.queryByText(progress.goal)).toBeNull();
        expect(screen.queryByRole('complementary')).toBeNull();
        expect(screen.queryByText(question.response.answer)).toBeNull();
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
    const { store } = fixture(
      async () => ({
        ok: true,
        progress: { ...progress, status: 'VERIFIED_RESOLVED' },
      }),
      readQuestions,
    );
    await waitFor(() => expect(readQuestions).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(progress.goal)).toBeNull();
    await act(async () =>
      finish({ ok: true, questions: { items: [question], truncated: false } }),
    );
    await screen.findByText(progress.goal);
    const answer = screen.getByRole('region', { name: 'Recorded answer' });
    expect(answer.textContent).toContain(question.response.answer);
    expect(answer.querySelector('script')).toBeNull();
    expect(answer.querySelector('time')?.getAttribute('datetime')).toBe(
      question.response.respondedAt,
    );
    expect(screen.getByText(/This case is closed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    await waitFor(() => expect(readQuestions).toHaveBeenCalledTimes(2));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Case progress' }),
    );
    await act(async () => finish({ ok: false, error: { kind: 'not-found' } }));
    await screen.findByText('Case progress is unavailable.');
    expect(
      screen.queryByRole('region', { name: 'Recorded answer' }),
    ).toBeNull();
    expect(screen.queryByText(progress.goal)).toBeNull();
    store.dispatch(progressApi.util.resetApiState());
  });
  it('does not acquire history after progress denial', async () => {
    const readQuestions = vi.fn<ProgressClient['readQuestions']>();
    const { store } = fixture(
      async () => ({ ok: false, error: { kind: 'not-found' } }),
      readQuestions,
    );
    await screen.findByText('Case progress is unavailable.');
    expect(readQuestions).not.toHaveBeenCalled();
    store.dispatch(progressApi.util.resetApiState());
  });
  it('hides before recheck I/O, keeps stable focus and never restores retained facts on failure', async () => {
    let finish: (value: ProgressResult) => void = () => undefined;
    const read = vi
      .fn<ProgressClient['read']>()
      .mockResolvedValueOnce({ ok: true, progress })
      .mockImplementationOnce(() => {
        expect(screen.queryByText(progress.goal)).toBeNull();
        expect(screen.queryByText(query.caseId)).toBeNull();
        expect(document.querySelector('time')).toBeNull();
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
    expect(screen.queryByRole('complementary')).toBeNull();
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

describe('bounded requester canvas', () => {
  it.each(['OPEN', 'VERIFIED_RESOLVED'] as const)(
    'presents only the disclosed %s lifecycle with no invented controls or stages',
    (status) => {
      render(
        <RequesterCanvas
          progress={{ ...progress, status }}
          questions={{ items: [], truncated: false }}
        />,
      );
      expect(screen.getByRole('heading', { name: progress.goal })).toBeTruthy();
      expect(
        screen.getByRole('complementary', { name: 'Request details' }),
      ).toBeTruthy();
      expect(screen.getByText(query.caseId)).toBeTruthy();
      for (const name of [
        'What we need from you',
        'What Ergon is checking',
        'Outcome proof',
        'Confirm the outcome',
      ]) {
        expect(screen.getByRole('heading', { name })).toBeTruthy();
      }
      expect(
        screen.getByText(
          status === 'OPEN'
            ? 'No verified resolution recorded'
            : 'Accepted outcome recorded',
        ),
      ).toBeTruthy();
      expect(
        screen.getByText('Individual checks are not disclosed.'),
      ).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
      expect(document.querySelector('img')).toBeNull();
      expect(document.querySelectorAll('time')).toHaveLength(2);
    },
  );
});
