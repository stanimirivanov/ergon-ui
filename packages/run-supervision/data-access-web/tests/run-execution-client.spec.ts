import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  normalizeRunExecutionFailure,
  runExecutionApi,
  runSupervisionApi,
  type RunExecutionClient,
  type RunExecutionCommand,
  type RunSupervisionClient,
} from '../src';
import {
  TENANT_ID,
  RUN_ID,
  OTHER_RUN_ID,
  jsonResponse,
} from './run-supervision-fixtures';

const command: RunExecutionCommand = {
  kind: 'execute',
  tenantId: TENANT_ID,
  runId: RUN_ID,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedSupervisionRevision: 3,
  expectedRunVersion: 0,
  requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  decisionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};
const recovery: RunExecutionCommand = {
  kind: 'resume',
  tenantId: TENANT_ID,
  runId: RUN_ID,
  commandId: command.commandId,
  attemptId: '88888888-8888-4888-8888-888888888888',
  expectedSupervisionRevision: 5,
  expectedRunVersion: 0,
};
const incomplete = {
  commandId: command.commandId,
  attemptId: command.commandId,
  runId: RUN_ID,
  status: 'INCOMPLETE',
  admittedRecordedAt: '2026-10-16T08:00:00Z',
  outcome: null,
  resultingState: null,
  runSequence: null,
  completedAt: null,
  resultRecordedAt: null,
};
const completed = {
  ...incomplete,
  status: 'COMPLETED',
  outcome: 'SUCCEEDED',
  resultingState: 'VERIFYING',
  runSequence: 1,
  completedAt: '2026-10-16T08:00:01Z',
  resultRecordedAt: '2026-10-16T08:00:02Z',
};
const review = {
  supported: true,
  observedAt: '2026-10-16T08:00:00Z',
  supervisionRevision: 3,
  runVersion: 0,
  requestId: command.requestId,
  decisionId: command.decisionId,
  commandId: null,
  canExecute: true,
  canResume: false,
};
const query = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  expectedRunVersion: 0,
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral-execution-token' };
const signal = (): AbortSignal => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('supervisor execution protocol', () => {
  it.each([
    ['INCOMPLETE', incomplete, 202],
    ['RESULT_RECORDED', { ...incomplete, status: 'RESULT_RECORDED' }, 202],
    ['COMPLETED', completed, 200],
    [
      'FAILED',
      { ...completed, outcome: 'FAILED', resultingState: 'ACTION_FAILED' },
      200,
    ],
  ] as const)(
    'decodes %s without inventing proof and strips private extras',
    async (_label, receipt, status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse(
            {
              ...receipt,
              actorId: 'PRIVATE',
              providerOperationReference: 'PRIVATE',
            },
            status,
          ),
        );
      expect(
        await createRunSupervisionClient({ fetch }).submitExecution(
          command,
          signal(),
        ),
      ).toEqual({ ok: true, receipt });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[1]?.[1]).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': csrf.token },
      });
      expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
        commandId: command.commandId,
        expectedSupervisionRevision: 3,
        expectedRunVersion: 0,
        requestId: command.requestId,
        decisionId: command.decisionId,
      });
    },
  );
  it('rechecks exact intent without minting another key and sends distinct explicit recovery coordinates', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    for (const intent of [command, command, recovery]) {
      fetch.mockResolvedValueOnce(jsonResponse(csrf)).mockResolvedValueOnce(
        jsonResponse(
          {
            ...incomplete,
            attemptId:
              intent.kind === 'execute' ? intent.commandId : intent.attemptId,
          },
          202,
        ),
      );
    }
    const client = createRunSupervisionClient({ fetch });
    for (const intent of [command, command, recovery])
      expect((await client.submitExecution(intent, signal())).ok).toBe(true);
    expect(fetch.mock.calls[1]?.[1]?.body).toEqual(
      fetch.mock.calls[3]?.[1]?.body,
    );
    expect(fetch.mock.calls[5]?.[0]).toBe(
      `/bff/v1/tenants/${TENANT_ID}/resolution-runs/${RUN_ID}/execution-commands/${command.commandId}/attempts`,
    );
    expect(JSON.parse(String(fetch.mock.calls[5]?.[1]?.body))).toEqual({
      attemptId: recovery.attemptId,
      expectedSupervisionRevision: 5,
      expectedRunVersion: 0,
    });
    expect(fetch).toHaveBeenCalledTimes(6);
  });
  it.each([
    [incomplete, 200],
    [completed, 202],
    [{ ...completed, commandId: OTHER_RUN_ID }, 200],
    [{ ...completed, attemptId: OTHER_RUN_ID }, 200],
    [{ ...completed, runId: OTHER_RUN_ID }, 200],
    [{ ...completed, resultingState: 'VERIFIED_RESOLVED' }, 200],
    [{ ...completed, outcome: 'FAILED' }, 200],
    [{ ...completed, runSequence: 2 }, 200],
    [{ ...incomplete, outcome: 'SUCCEEDED' }, 202],
    [{ ...completed, completedAt: 'yesterday' }, 200],
  ])('rejects mismatched status or attribution %#', async (body, status) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(jsonResponse(body, status));
    expect(
      await createRunSupervisionClient({ fetch }).submitExecution(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects unsupported intent before CSRF and permits only the reviewed revision-zero step', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const invalid = { ...command, expectedSupervisionRevision: -1 };
    expect(
      await createRunSupervisionClient({ fetch }).submitExecution(
        invalid,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-execution' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [409, 'run-execution-conflict', 'execution-conflict'],
    [503, 'run-execution-disabled', 'execution-disabled'],
    [503, 'run-execution-unavailable', 'execution-unavailable'],
    [400, 'invalid-run-execution', 'invalid-execution'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
    [404, 'assigned-resolution-run-not-found', 'not-found'],
    [404, 'unknown-route', 'execution-unsupported'],
  ])(
    'maps stable %s %s without retry or private problem text',
    async (status, problem, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse(
            { type: `urn:ergon:problem:${problem}`, detail: 'PRIVATE' },
            Number(status),
          ),
        );
      expect(
        await createRunSupervisionClient({ fetch }).submitExecution(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('retries transient review once and decodes disabled and recovery observations without inventing permission', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse({ ...review, actorId: 'PRIVATE' }));
    expect(
      await createRunSupervisionClient({ fetch }).getExecutionReview(
        query,
        signal(),
      ),
    ).toEqual({ ok: true, review });
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const value of [
      { ...review, supported: false, canExecute: false },
      {
        ...review,
        commandId: command.commandId,
        canExecute: false,
        canResume: true,
      },
    ]) {
      fetch.mockResolvedValueOnce(jsonResponse(value));
      expect(
        await createRunSupervisionClient({ fetch }).getExecutionReview(
          query,
          signal(),
        ),
      ).toEqual({ ok: true, review: value });
    }
  });
  it.each([
    { ...review, supported: false },
    { ...review, commandId: command.commandId },
    { ...review, requestId: null },
    { ...review, canExecute: false, canResume: true },
    { ...review, runVersion: Number.MAX_SAFE_INTEGER },
    { ...review, supported: null },
  ])('rejects inconsistent review %# without partial caching', async (body) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(body));
    expect(
      await createRunSupervisionClient({ fetch }).getExecutionReview(
        query,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('bounds CSRF plus POST/body with one deadline, physically aborts and never retries a command', async () => {
    vi.useFakeTimers();
    let postSignal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockImplementationOnce((_url, init) => {
        postSignal = init?.signal;
        return Promise.resolve(
          new Response(new ReadableStream<Uint8Array>(), { status: 202 }),
        );
      });
    const pending = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 10,
    }).submitExecution(command, signal());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(11);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(postSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('returns cancellation before setup for an aborted caller', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const controller = new AbortController();
    controller.abort();
    expect(
      await createRunSupervisionClient({ fetch }).submitExecution(
        command,
        controller.signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'request-cancelled' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { runSupervision: { listAssigned: vi.fn(), getConsole: vi.fn() } },
  ])(
    'contains missing execution bindings before RTK logging %#',
    async (extra) => {
      const errorLog = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const store = configureStore({
        reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
        middleware: (get) =>
          get({ thunk: { extraArgument: extra } }).concat(
            runSupervisionApi.middleware,
          ),
      });
      const read = store.dispatch(
        runExecutionApi.endpoints.getRunExecutionReview.initiate(query),
      );
      const mutation = store.dispatch(
        runExecutionApi.endpoints.submitRunExecution.initiate(command),
      );
      expect(await read).toMatchObject({
        error: { kind: 'unexpected-defect' },
      });
      expect(await mutation).toMatchObject({
        error: { kind: 'unexpected-defect' },
      });
      expect(errorLog).not.toHaveBeenCalled();
      read.unsubscribe();
      mutation.reset();
      store.dispatch(runSupervisionApi.util.resetApiState());
    },
  );
  it('contains rejected read/mutation defects without raw Redux data or logs', async () => {
    const client: RunSupervisionClient & RunExecutionClient = {
      listAssigned: vi.fn(),
      getConsole: vi.fn(),
      getExecutionReview: async () => {
        throw new Error('PRIVATE');
      },
      submitExecution: async () => {
        throw new Error('PRIVATE');
      },
    };
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
      middleware: (get) =>
        get({ thunk: { extraArgument: { runSupervision: client } } }).concat(
          runSupervisionApi.middleware,
        ),
    });
    const read = store.dispatch(
      runExecutionApi.endpoints.getRunExecutionReview.initiate(query),
    );
    const mutation = store.dispatch(
      runExecutionApi.endpoints.submitRunExecution.initiate(command),
    );
    expect(await read).toMatchObject({ error: { kind: 'unexpected-defect' } });
    expect(await mutation).toMatchObject({
      error: { kind: 'unexpected-defect' },
    });
    expect(JSON.stringify(store.getState())).not.toContain('PRIVATE');
    expect(errorLog).not.toHaveBeenCalled();
    read.unsubscribe();
    mutation.reset();
    store.dispatch(runSupervisionApi.util.resetApiState());
    expect(
      normalizeRunExecutionFailure({
        kind: 'execution-conflict',
        cause: 'PRIVATE',
      }),
    ).toEqual({ kind: 'execution-conflict' });
  });
});
