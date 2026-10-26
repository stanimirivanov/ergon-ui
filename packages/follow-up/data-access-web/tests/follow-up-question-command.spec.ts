import { configureStore } from '@reduxjs/toolkit';
import { expect, it, vi } from 'vitest';
import {
  createHumanFollowUpBffAdapter,
  followUpQuestionsApi,
  normalizeFollowUpQuestionFailure,
} from '../src';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const command = {
  tenantId: id,
  workItemId: id,
  caseId: id,
  claimId: id,
  expectedOwnershipRevision: 3,
  requestId: id,
  question: '  Which workspace? <script>inert</script> 😀\n',
};
const receipt = {
  requestId: id,
  caseId: id,
  claimId: id,
  ownershipRevision: 3,
  authorActorId: other,
  question: command.question,
  requestedAt: '2026-10-26T08:00:00Z',
  recordedAt: '2026-10-26T08:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-question-token' };
const signal = (): AbortSignal => new AbortController().signal;

it('shares session CSRF with existing notes rather than creating an isolated token cache', async () => {
  const note = {
    noteId: id,
    claimId: id,
    ownershipRevision: 3,
    authorActorId: other,
    text: 'Internal only',
    authoredAt: receipt.requestedAt,
    recordedAt: receipt.recordedAt,
  };
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json(csrf))
    .mockResolvedValueOnce(Response.json(receipt, { status: 201 }))
    .mockResolvedValueOnce(Response.json(note, { status: 201 }));
  const client = createHumanFollowUpBffAdapter({ fetch });
  await client.recordQuestion(command, signal());
  expect(
    await client.appendNote(
      { ...command, noteId: id, text: note.text },
      signal(),
    ),
  ).toEqual({ ok: true, note });
  expect(
    fetch.mock.calls.filter(([url]) => url === '/bff/v1/csrf'),
  ).toHaveLength(1);
  expect(fetch.mock.calls[2]?.[1]?.headers).toMatchObject({
    'X-CSRF-TOKEN': csrf.token,
  });
});

it.each([200, 201])(
  'accepts an exact %s acknowledgement using shared CSRF and no caller author/case/time',
  async (status) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      // History-only fields must neither change the acknowledgement contract nor enter the receipt.
      .mockResolvedValueOnce(
        Response.json(
          { ...receipt, response: { answer: 'not a receipt field' } },
          { status },
        ),
      )
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(await client.recordQuestion(command, signal())).toEqual({
      ok: true,
      question: receipt,
    });
    expect(await client.recordQuestion(command, signal())).toEqual({
      ok: true,
      question: receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `/bff/v1/tenants/${id}/human-follow-ups/${id}/information-requests`,
    );
    const init = fetch.mock.calls[1]?.[1];
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-TOKEN': csrf.token },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      requestId: id,
      claimId: id,
      expectedOwnershipRevision: 3,
      question: command.question,
    });
    expect(fetch.mock.calls[2]?.[1]?.body).toBe(init?.body);
  },
);

it.each([
  { requestId: other },
  { caseId: other },
  { claimId: other },
  { ownershipRevision: 2 },
  { question: command.question.trim() },
  { authorActorId: 'invalid' },
  { recordedAt: 'invalid' },
])(
  'rejects a mismatched or malformed receipt %# without replay',
  async (change) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json({ ...receipt, ...change }, { status: 201 }),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).recordQuestion(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it.each([
  [400, 'invalid-requester-information-request', 'invalid-question'],
  [404, 'requester-information-request-not-found', 'not-found'],
  [409, 'requester-information-request-conflict', 'question-conflict'],
] as const)(
  'maps status %s without exposing problem detail',
  async (status, problem, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json(
          { type: `urn:ergon:problem:${problem}`, detail: 'private' },
          { status },
        ),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).recordQuestion(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it('never retries an uncertain POST automatically and explicitly replays its exact body', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json(csrf))
    .mockRejectedValueOnce(new Error('private network detail'))
    .mockResolvedValueOnce(Response.json(receipt));
  const client = createHumanFollowUpBffAdapter({ fetch });
  expect(await client.recordQuestion(command, signal())).toEqual({
    ok: false,
    error: { kind: 'transport' },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  await client.recordQuestion(command, signal());
  expect(fetch.mock.calls[2]?.[1]?.body).toBe(fetch.mock.calls[1]?.[1]?.body);
});

it('contains defective mutation clients and normalizes unknown failures without leaking causes', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const store = configureStore({
    reducer: {
      [followUpQuestionsApi.reducerPath]: followUpQuestionsApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            recordFollowUpQuestion: async () => {
              throw new Error('private');
            },
          },
        },
      }).concat(followUpQuestionsApi.middleware),
  });
  const handle = store.dispatch(
    followUpQuestionsApi.endpoints.recordFollowUpQuestion.initiate(command),
  );
  expect(await handle).toMatchObject({ error: { kind: 'unexpected-defect' } });
  expect(
    normalizeFollowUpQuestionFailure({
      kind: 'question-conflict',
      detail: 'private',
    }),
  ).toEqual({ kind: 'question-conflict' });
  expect(
    normalizeFollowUpQuestionFailure({
      kind: 'service-unavailable',
      status: '503',
    }),
  ).toEqual({ kind: 'unexpected-defect' });
  expect(log).not.toHaveBeenCalled();
  handle.reset();
  store.dispatch(followUpQuestionsApi.util.resetApiState());
  log.mockRestore();
});
