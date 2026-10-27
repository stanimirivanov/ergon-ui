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
  type RequesterAnswerClient,
  type RequesterAnswerResult,
  type RequesterQuestionsResult,
} from '@ergon/requester-progress-data-access-web';
import { RequesterCaseProgress } from '../src/requester-progress';
import { RequesterAnswerForm } from '../src/requester-answer-form';

const query = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
};
const progress = {
  caseId: query.caseId,
  goal: 'Private case goal',
  status: 'OPEN' as const,
  openedAt: '2026-10-27T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
};
const question = {
  requestId: '22222222-2222-4222-8222-222222222222',
  question: 'Which browser?',
  requestedAt: progress.openedAt,
  recordedAt: progress.updatedAt,
  response: null,
};
const answer = ' Exact 😀 <script>inert</script>\nanswer ';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function fixture(
  recordAnswer: RequesterAnswerClient['recordAnswer'],
  options: { closed?: boolean; omitted?: boolean; answered?: boolean } = {},
) {
  const read = vi.fn(async () => ({
    ok: true as const,
    progress: {
      ...progress,
      status: options.closed
        ? ('VERIFIED_RESOLVED' as const)
        : ('OPEN' as const),
    },
  }));
  const readQuestions = vi
    .fn<() => Promise<RequesterQuestionsResult>>()
    .mockResolvedValue({
      ok: true,
      questions: {
        items: [
          options.omitted
            ? {
                requestId: question.requestId,
                question: question.question,
                requestedAt: question.requestedAt,
                recordedAt: question.recordedAt,
              }
            : options.answered
              ? {
                  ...question,
                  response: {
                    responseId: query.caseId,
                    answer,
                    respondedAt: progress.openedAt,
                    recordedAt: progress.updatedAt,
                  },
                }
              : question,
        ],
        truncated: false,
      },
    });
  const store = configureStore({
    reducer: { [progressApi.reducerPath]: progressApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            progressClient: { read, readQuestions, recordAnswer },
          },
        },
      }).concat(progressApi.middleware),
  });
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <RequesterCaseProgress query={query} signInHref="/bff/login" />
      </Provider>
    </StrictMode>,
  );
  return { ...view, store, read, readQuestions };
}
async function submit(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Answer question: Which browser?',
    }),
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
    target: { value: answer },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Record final answer' }));
}
describe('requester answer workflow', () => {
  it('keeps uncertain intent sealed when a later exact replay is rejected', async () => {
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValue({ ok: false, error: { kind: 'invalid-answer' } });
    fixture(record);
    await submit();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry exact answer' }),
    );
    await screen.findByText(/earlier outcome remains uncertain/);
    expect(screen.queryByText(progress.goal)).toBeNull();
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[1]?.[0]).toEqual(record.mock.calls[0]?.[0]);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    await screen.findByText(progress.goal);
    expect(
      screen.queryByRole('button', { name: /Answer question:/ }),
    ).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('withholds replay during failed fresh access and retains the original intent for a restored OPEN observation', async () => {
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockResolvedValue({ ok: false, error: { kind: 'transport' } });
    const view = fixture(record);
    await submit();
    await screen.findByRole('button', { name: 'Retry exact answer' });
    view.readQuestions.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'not-found' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    await screen.findByRole('heading', {
      name: 'Case progress is unavailable.',
    });
    expect(
      screen.queryByRole('button', { name: 'Retry exact answer' }),
    ).toBeNull();
    expect(record).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry exact answer' }),
    );
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[1]?.[0]).toEqual(record.mock.calls[0]?.[0]);
  });
  it('commits withdrawal and focus before one POST in StrictMode, then independently reacquires history', async () => {
    const boundaries: {
      text: string;
      editors: number;
      focus: Element | null;
    }[] = [];
    let finish: (value: RequesterAnswerResult) => void = () => undefined;
    let finishHistory: (value: RequesterQuestionsResult) => void = () =>
      undefined;
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockImplementation(() => {
        boundaries.push({
          text: document.body.textContent ?? '',
          editors: document.querySelectorAll('textarea, [role="textbox"]')
            .length,
          focus: document.activeElement,
        });
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
    const view = fixture(record);
    await submit();
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(boundaries[0]?.text).not.toContain(progress.goal);
    expect(boundaries[0]?.text).not.toContain(question.question);
    expect(boundaries[0]?.editors).toBe(0);
    expect(boundaries[0]?.focus).toBe(
      screen.getByRole('heading', { name: 'Case progress' }),
    );
    const command = record.mock.calls[0]?.[0];
    if (!command) throw new Error('Missing submitted command');
    expect(command.answer).toBe(answer);
    view.readQuestions.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishHistory = resolve;
        }),
    );
    await act(async () => finish({ ok: true, responseId: command.responseId }));
    await waitFor(() => expect(view.readQuestions).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Answer recording acknowledged/)).toBeTruthy();
    expect(screen.queryByText(progress.goal)).toBeNull();
    expect(screen.queryByText(answer)).toBeNull();
    await act(async () =>
      finishHistory({
        ok: true,
        questions: {
          items: [
            {
              ...question,
              response: {
                responseId: command.responseId,
                answer,
                respondedAt: progress.openedAt,
                recordedAt: progress.updatedAt,
              },
            },
          ],
          truncated: false,
        },
      }),
    );
    expect(
      await screen.findByRole('region', { name: 'Recorded answer' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Answer question:/ }),
    ).toBeNull();
    expect(record).toHaveBeenCalledTimes(1);
    expect(view.store.getState().requesterProgressApi.mutations).toEqual({});
  });
  it('retains exact uncertain intent across an independent recheck and only explicitly replays it', async () => {
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(async (command) => ({
        ok: true,
        responseId: command.responseId,
      }));
    const view = fixture(record);
    await submit();
    await screen.findByRole('button', { name: 'Retry exact answer' });
    expect(screen.queryByText(progress.goal)).toBeNull();
    expect(record).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
    await screen.findByText(progress.goal);
    expect(view.readQuestions).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: /Answer question:/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry exact answer' }));
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[1]?.[0]).toEqual(record.mock.calls[0]?.[0]);
    await waitFor(() => expect(view.readQuestions).toHaveBeenCalledTimes(3));
  });
  it.each([{ closed: true }, { omitted: true }, { answered: true }])(
    'never offers a new answer for unsupported, answered or closed snapshots: %s',
    async (options) => {
      const record = vi.fn<RequesterAnswerClient['recordAnswer']>();
      fixture(record, options);
      await screen.findByText(progress.goal);
      expect(
        screen.queryByRole('button', { name: /Answer question:/ }),
      ).toBeNull();
      expect(record).not.toHaveBeenCalled();
    },
  );
  it('keeps invalid-answer correction in RHF without permitting replay', async () => {
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockResolvedValue({ ok: false, error: { kind: 'invalid-answer' } });
    fixture(record);
    await submit();
    const field = await screen.findByRole('textbox', { name: 'Your answer' });
    expect((field as HTMLTextAreaElement).value).toBe(answer);
    expect(
      screen.queryByRole('button', { name: 'Retry exact answer' }),
    ).toBeNull();
    expect(
      await screen.findAllByText(/server rejected this answer/),
    ).not.toHaveLength(0);
  });
  it('retires pending mutation observation on unmount without disclosing its late result', async () => {
    let finish: (value: RequesterAnswerResult) => void = () => undefined;
    const record = vi
      .fn<RequesterAnswerClient['recordAnswer']>()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    const view = fixture(record);
    await submit();
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    const command = record.mock.calls[0]?.[0];
    view.unmount();
    expect(record.mock.calls[0]?.[1].aborted).toBe(true);
    await act(async () =>
      finish({ ok: true, responseId: command?.responseId ?? '' }),
    );
    expect(view.read).toHaveBeenCalledTimes(1);
    expect(view.store.getState().requesterProgressApi.mutations).toEqual({});
  });
  it('rejects empty/unreviewed input and retires asynchronous validation when the form is removed', async () => {
    const onSubmit = vi.fn();
    const view = render(
      <RequesterAnswerForm question={question.question} onSubmit={onSubmit} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Record final answer' }),
    );
    await screen.findByText(/Enter nonblank/);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: answer },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    const element = screen
      .getByRole('button', { name: 'Record final answer' })
      .closest('form');
    if (!element) throw new Error('Missing answer form');
    fireEvent.submit(element);
    view.unmount();
    await act(async () => undefined);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
