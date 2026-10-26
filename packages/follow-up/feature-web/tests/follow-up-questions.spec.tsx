import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  humanFollowUpApi,
  type RecordFollowUpQuestion,
  type ListFollowUpQuestions,
} from '@ergon/follow-up-data-access-web';
import { FollowUpQuestionsInspector } from '../src/follow-up-questions-inspector';
import { createFollowUpTestStore } from './follow-up-test-store';
import { installNativeDialogTestDouble } from './native-dialog-test-double';

const query = {
  tenantId: 'tenant',
  workItemId: 'work',
  caseId: 'case',
  claimId: 'claim',
  expectedOwnershipRevision: 3,
};
const oldQuestion = {
  requestId: 'old',
  caseId: 'case',
  claimId: 'previous',
  ownershipRevision: 1,
  authorActorId: 'author',
  question: 'Private old question',
  requestedAt: '2026-10-25T08:00:00Z',
  recordedAt: '2026-10-25T08:00:01Z',
};
const stores: ReturnType<typeof createFollowUpTestStore>[] = [];
let restore: () => void;
beforeEach(() => {
  restore = installNativeDialogTestDouble();
});
afterEach(() => {
  cleanup();
  for (const store of stores.splice(0))
    store.dispatch(humanFollowUpApi.util.resetApiState());
  restore();
});

function setup(
  recordQuestion: RecordFollowUpQuestion,
  listQuestions: ListFollowUpQuestions = async () => ({
    ok: true,
    questions: { items: [oldQuestion], truncated: false },
  }),
) {
  const store = createFollowUpTestStore({ recordQuestion, listQuestions });
  stores.push(store);
  const lost = vi.fn();
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <FollowUpQuestionsInspector query={query} onAccessLost={lost} />
      </Provider>
    </StrictMode>,
  );
  return { ...view, lost };
}
async function open(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Requester questions' }));
  await screen.findByText(oldQuestion.question);
}
async function confirm(question = '  Exact question 😀\n'): Promise<void> {
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Question for the requester' }),
    { target: { value: question } },
  );
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Record requester question',
    }),
  );
}

it('requires valid Unicode text and deliberate acknowledgement without issuing a POST', async () => {
  const record = vi.fn<RecordFollowUpQuestion>();
  setup(record);
  await open();
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: ' \u00a0' } });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Record requester question',
    }),
  );
  await screen.findByText(/Enter nonblank text/);
  fireEvent.change(field, { target: { value: 'Valid question' } });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Record requester question',
    }),
  );
  await screen.findByText(/Confirm the requester/);
  expect(record).not.toHaveBeenCalled();
});

it('commits history/form withdrawal before I/O, prevents double POST and replays only exact uncertain intent', async () => {
  let resolveFirst:
    ((value: Awaited<ReturnType<RecordFollowUpQuestion>>) => void) | undefined;
  const first = new Promise<Awaited<ReturnType<RecordFollowUpQuestion>>>(
    (resolve) => {
      resolveFirst = resolve;
    },
  );
  const record = vi
    .fn<RecordFollowUpQuestion>()
    .mockImplementationOnce(() => {
      expect(screen.queryByText(oldQuestion.question)).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
      return first;
    })
    .mockImplementation(async (command) => ({
      ok: true,
      question: {
        ...oldQuestion,
        ...command,
        ownershipRevision: command.expectedOwnershipRevision,
      },
    }));
  const read = vi.fn<ListFollowUpQuestions>().mockResolvedValue({
    ok: true,
    questions: { items: [oldQuestion], truncated: false },
  });
  setup(record, read);
  await open();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '  Exact question 😀\n' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  const submit = screen.getByRole('button', {
    name: 'Record requester question',
  });
  fireEvent.click(submit);
  fireEvent.click(submit);
  await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
  await act(async () =>
    resolveFirst?.({ ok: false, error: { kind: 'transport' } }),
  );
  const retry = await screen.findByRole('button', {
    name: 'Retry exact question',
  });
  expect(screen.queryByText(oldQuestion.question)).toBeNull();
  fireEvent.click(retry);
  await screen.findByText(/^Question recorded/);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(record).toHaveBeenCalledTimes(2);
  expect(record.mock.calls[1]?.[0]).toBe(record.mock.calls[0]?.[0]);
  expect(record.mock.calls[0]?.[0].question).toBe('  Exact question 😀\n');
  await screen.findByRole('textbox');
});

it.each(['not-found', 'question-conflict', 'forbidden'] as const)(
  'withdraws access on %s without offering replay',
  async (kind) => {
    const { lost } = setup(async () => ({ ok: false, error: { kind } }));
    await open();
    await confirm();
    await waitFor(() => expect(lost).toHaveBeenCalledOnce());
    expect(screen.queryByText(oldQuestion.question)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Retry exact question' }),
    ).toBeNull();
  },
);

it('retires a pending command on close and never applies a late acknowledgement after reopening', async () => {
  let finish:
    ((value: Awaited<ReturnType<RecordFollowUpQuestion>>) => void) | undefined;
  const record = vi.fn<RecordFollowUpQuestion>().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  setup(record);
  await open();
  await confirm();
  await waitFor(() => expect(record).toHaveBeenCalledOnce());
  fireEvent.click(
    screen.getByRole('button', { name: 'Close requester questions' }),
  );
  expect(record.mock.calls[0]?.[1].aborted).toBe(true);
  await open();
  await act(async () => finish?.({ ok: true, question: oldQuestion }));
  expect(screen.queryByText(/^Question recorded/)).toBeNull();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  expect(
    within(screen.getByRole('dialog')).queryByRole('button', {
      name: 'Retry exact question',
    }),
  ).toBeNull();
});

it('returns a rejected question to RHF with acknowledgement cleared', async () => {
  const record = vi
    .fn<RecordFollowUpQuestion>()
    .mockResolvedValue({ ok: false, error: { kind: 'invalid-question' } });
  setup(record);
  await open();
  await confirm('Exact rejected text');
  await screen.findByText(/The server rejected this question/);
  const field = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(field.value).toBe('Exact rejected text');
  expect(document.activeElement).toBe(field);
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(
    false,
  );
});

it('never treats acknowledgement as fresh history when the independent read fails', async () => {
  let finishRead:
    ((value: Awaited<ReturnType<ListFollowUpQuestions>>) => void) | undefined;
  const held = new Promise<Awaited<ReturnType<ListFollowUpQuestions>>>(
    (resolve) => {
      finishRead = resolve;
    },
  );
  const read = vi
    .fn<ListFollowUpQuestions>()
    .mockResolvedValueOnce({
      ok: true,
      questions: { items: [oldQuestion], truncated: false },
    })
    .mockReturnValueOnce(held)
    .mockResolvedValue({
      ok: true,
      questions: { items: [], truncated: false },
    });
  setup(async () => ({ ok: true, question: oldQuestion }), read);
  await open();
  await confirm();
  await screen.findByText(/^Question recorded/);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(screen.queryByText(oldQuestion.question)).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  await act(async () =>
    finishRead?.({ ok: false, error: { kind: 'transport' } }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Try questions again' }),
  );
  await screen.findByText('No requester questions recorded.');
  await screen.findByRole('textbox');
  expect(screen.getByText(/^Question recorded/)).toBeTruthy();
});

it('retires an asynchronous form validation when history recheck removes its draft', async () => {
  let finish:
    ((value: Awaited<ReturnType<ListFollowUpQuestions>>) => void) | undefined;
  const held = new Promise<Awaited<ReturnType<ListFollowUpQuestions>>>(
    (resolve) => {
      finish = resolve;
    },
  );
  const read = vi
    .fn<ListFollowUpQuestions>()
    .mockResolvedValueOnce({
      ok: true,
      questions: { items: [oldQuestion], truncated: false },
    })
    .mockReturnValueOnce(held);
  const record = vi.fn<RecordFollowUpQuestion>();
  setup(record, read);
  await open();
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: 'Retired draft' } });
  fireEvent.click(screen.getByRole('checkbox'));
  const form = field.closest('form');
  if (form === null) throw new Error('Question input must belong to its form');
  fireEvent.submit(form);
  fireEvent.click(
    screen.getByRole('button', { name: 'Recheck question access' }),
  );
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  await act(async () =>
    finish?.({ ok: true, questions: { items: [], truncated: false } }),
  );
  expect(record).not.toHaveBeenCalled();
  await screen.findByRole('textbox');
});
