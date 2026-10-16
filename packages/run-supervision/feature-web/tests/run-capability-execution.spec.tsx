import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type RunExecutionClient,
  type RunExecutionCommand,
  type RunExecutionCommandResult,
  type RunExecutionReview,
  type RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignedRunWorkspace } from '../src';
import {
  assignedPage,
  assignedRunConsole,
  RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

const REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DECISION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const at = '2026-10-16T08:00:00Z';
const review: RunExecutionReview = {
  supported: true,
  observedAt: at,
  supervisionRevision: 7,
  runVersion: 0,
  requestId: REQUEST_ID,
  decisionId: DECISION_ID,
  commandId: null,
  canExecute: true,
  canResume: false,
};
const stores: ReturnType<typeof buildStore>[] = [];
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  // Lifecycle only; real keyboard containment/inertness are checked in Chromium.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
  for (const [name, original] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (original === undefined)
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    else Object.defineProperty(HTMLDialogElement.prototype, name, original);
  }
  vi.restoreAllMocks();
});

describe('confirmed pinned capability execution', () => {
  it('warns that exact retry can first admit the original intent when the previous request never arrived', async () => {
    let admissions = 0;
    const send = vi
      .fn<RunExecutionClient['submitExecution']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(async (intent) => {
        admissions += 1;
        return receipt(intent);
      });
    renderWorkspace({ ...successfulClient(), submitExecution: send });
    await select();
    await openReview();
    await confirm();
    expect(
      await screen.findByText(/If the previous request was never admitted/),
    ).toBeTruthy();
    expect(admissions).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact execution intent' }),
    );
    expect(
      await screen.findByText(
        'Execution incomplete · external effect uncertain',
      ),
    ).toBeTruthy();
    expect(admissions).toBe(1);
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });
  it('prioritizes a later handover access failure over historical execution feedback', async () => {
    const base = successfulClient();
    const client = {
      ...base,
      getConsole: async (
        ...args: Parameters<RunSupervisionClient['getConsole']>
      ) => {
        const result = await base.getConsole(...args);
        return result.ok
          ? {
              ok: true as const,
              console: { ...result.console, handoverSupported: true },
            }
          : result;
      },
      listHandoverCandidates: async () => ({
        ok: false as const,
        error: { kind: 'not-found' as const },
      }),
      handoverSupervisor: vi.fn(),
    };
    renderWorkspace(client);
    await select();
    await openReview();
    await confirm();
    await screen.findByText('Execution incomplete · external effect uncertain');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Hand over supervision' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Recipient access unavailable',
      }),
    ).toBeTruthy();
    expect(
      screen.queryByText('Execution incomplete · external effect uncertain'),
    ).toBeNull();
  });
  it('reads only on demand, requires acknowledgement and cancels without a command', async () => {
    const client = successfulClient();
    const read = vi.spyOn(client, 'getExecutionReview');
    const send = vi.spyOn(client, 'submitExecution');
    renderWorkspace(client);
    await select();
    expect(read).not.toHaveBeenCalled();
    await openReview();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Authorize and execute pinned action',
      }),
    );
    expect(
      await screen.findByText(
        'Acknowledge the external effect and recovery boundary before confirming.',
      ),
    ).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel execution review' }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Review execution or recovery' }),
    );
    await openReview();
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it('commits private DOM withdrawal and persistent focus before one held POST under StrictMode', async () => {
    const pending = deferred<RunExecutionCommandResult>();
    const send = vi.fn<RunExecutionClient['submitExecution']>(() => {
      expect(screen.queryByText('PRIVATE_EXECUTION_POLICY')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
      ).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Resolution run' }),
      );
      return pending.promise;
    });
    renderWorkspace({ ...successfulClient(), submitExecution: send });
    await select();
    await openReview();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Execution acknowledgement pending…')).toBeTruthy();
    const intent = send.mock.calls[0]?.[0];
    if (intent === undefined) throw new Error('Missing intent');
    await act(async () => {
      pending.resolve(receipt(intent));
    });
    expect(
      await screen.findByText(
        'Execution incomplete · external effect uncertain',
      ),
    ).toBeTruthy();
    expect(await screen.findByText('PRIVATE_EXECUTION_POLICY')).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('rechecks unchanged uncertain intent without redispatch, then confirms a distinct recovery attempt on the same command', async () => {
    let original: RunExecutionCommand | undefined;
    const client = successfulClient();
    const send = vi.fn<RunExecutionClient['submitExecution']>(
      async (intent) => {
        original ??= intent;
        if (send.mock.calls.length === 1) throw new Error('PRIVATE');
        return receipt(intent);
      },
    );
    const read = vi.fn<RunExecutionClient['getExecutionReview']>(async () => ({
      ok: true,
      review:
        original === undefined
          ? review
          : {
              ...review,
              canExecute: false,
              canResume: true,
              commandId: original.commandId,
            },
    }));
    renderWorkspace({
      ...client,
      submitExecution: send,
      getExecutionReview: read,
    });
    await select();
    await openReview();
    await confirm();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Retry exact execution intent',
      }),
    );
    expect(
      await screen.findByText(
        'Execution incomplete · external effect uncertain',
      ),
    ).toBeTruthy();
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
    await waitFor(() =>
      expect(screen.queryByText('PRIVATE_EXECUTION_POLICY')).not.toBeNull(),
    );
    await openReview('Confirm a new recovery attempt');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm new recovery attempt' }),
    );
    await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
    const first = send.mock.calls[0]?.[0];
    const recovered = send.mock.calls[2]?.[0];
    expect(recovered).toMatchObject({
      kind: 'resume',
      commandId: first?.commandId,
      expectedSupervisionRevision: 7,
      expectedRunVersion: 0,
    });
    expect(
      recovered?.kind === 'resume' ? recovered.attemptId : undefined,
    ).not.toBe(first?.commandId);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it.each(['stale', 'denied', 'unsupported'] as const)(
    'withdraws earlier context after a %s review without creating replay intent',
    async (mode) => {
      const client = successfulClient();
      const send = vi.spyOn(client, 'submitExecution');
      client.getExecutionReview = async () =>
        mode === 'stale'
          ? { ok: true, review: { ...review, supervisionRevision: 8 } }
          : {
              ok: false,
              error: {
                kind:
                  mode === 'unsupported'
                    ? 'execution-unsupported'
                    : 'not-found',
              },
            };
      renderWorkspace(client);
      await select();
      fireEvent.click(
        await screen.findByRole('button', {
          name: 'Review execution or recovery',
        }),
      );
      expect(
        await screen.findByText('Execution review unavailable'),
      ).toBeTruthy();
      expect(screen.queryByText('PRIVATE_EXECUTION_POLICY')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(
        screen.queryByRole('button', {
          name: 'Retry exact execution intent',
        }),
      ).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('renders disabled support without an enabled confirmation or a POST', async () => {
    const client = successfulClient();
    const send = vi.spyOn(client, 'submitExecution');
    client.getExecutionReview = async () => ({
      ok: true,
      review: { ...review, supported: false, canExecute: false },
    });
    renderWorkspace(client);
    await select();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Review execution or recovery',
      }),
    );
    expect(
      await screen.findByText(/Browser execution is disabled/),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: 'Authorize and execute pinned action',
      }),
    ).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  it('retires an open review on held Console revalidation and rejects a late response after unmount', async () => {
    const client = successfulClient();
    const first = client.getConsole;
    const pending =
      deferred<Awaited<ReturnType<RunSupervisionClient['getConsole']>>>();
    const send = vi.spyOn(client, 'submitExecution');
    const { store, unmount } = renderWorkspace(client);
    await select();
    await openReview();
    vi.spyOn(client, 'getConsole').mockImplementation(() => pending.promise);
    act(() => {
      store.dispatch(
        runSupervisionApi.util.invalidateTags([
          { type: 'RunDetail', id: `${TENANT_ID}:${RUN_ID}` },
        ]),
      );
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('PRIVATE_EXECUTION_POLICY')).toBeNull();
    unmount();
    await act(async () => {
      pending.resolve(
        await first(
          { tenantId: TENANT_ID, runId: RUN_ID },
          new AbortController().signal,
        ),
      );
    });
    expect(send).not.toHaveBeenCalled();
  });
  it('retires late command callbacks after navigation without implying server cancellation', async () => {
    const pending = deferred<RunExecutionCommandResult>();
    const client = successfulClient();
    const read = vi.spyOn(client, 'getConsole');
    const send = vi.fn<RunExecutionClient['submitExecution']>(
      () => pending.promise,
    );
    const { unmount } = renderWorkspace({ ...client, submitExecution: send });
    await select();
    await openReview();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const count = read.mock.calls.length;
    const intent = send.mock.calls[0]?.[0];
    if (intent === undefined) throw new Error('Missing intent');
    unmount();
    await act(async () => {
      pending.resolve(receipt(intent));
    });
    expect(read).toHaveBeenCalledTimes(count);
  });
});

async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  await screen.findByText('PRIVATE_EXECUTION_POLICY');
}
async function openReview(
  title = 'Confirm pinned capability execution',
): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Review execution or recovery' }),
  );
  await screen.findByRole('heading', { name: title });
}
async function confirm(): Promise<void> {
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Authorize and execute pinned action' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
function receipt(intent: RunExecutionCommand): RunExecutionCommandResult {
  return {
    ok: true,
    receipt: {
      commandId: intent.commandId,
      attemptId:
        intent.kind === 'execute' ? intent.commandId : intent.attemptId,
      runId: intent.runId,
      admittedRecordedAt: at,
      status: 'INCOMPLETE',
      outcome: null,
      resultingState: null,
      runSequence: null,
      completedAt: null,
      resultRecordedAt: null,
    },
  };
}
function successfulClient(): RunSupervisionClient & RunExecutionClient {
  return {
    listAssigned: async () => ({ ok: true, page: assignedPage() }),
    getConsole: async () => ({
      ok: true,
      console: {
        ...assignedRunConsole,
        policyRevision: 'PRIVATE_EXECUTION_POLICY',
        supervisionRevision: 7,
        handoverSupported: false,
        approvalReview: {
          status: 'DECIDED',
          observedAt: at,
          canDecide: false,
          request: {
            requestId: REQUEST_ID,
            authority: 'RESOLVER',
            requestedAt: at,
            expiresAt: '2026-10-16T08:15:00Z',
            recordedAt: at,
          },
          decision: {
            decisionId: DECISION_ID,
            outcome: 'APPROVED',
            decidedAt: at,
            recordedAt: at,
          },
        },
      },
    }),
    getExecutionReview: async () => ({ ok: true, review }),
    submitExecution: async (intent) => receipt(intent),
  };
}
function buildStore(client: RunSupervisionClient & RunExecutionClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({ thunk: { extraArgument: { runSupervision: client } } }).concat(
        runSupervisionApi.middleware,
      ),
  });
}
function renderWorkspace(client: RunSupervisionClient & RunExecutionClient) {
  const store = buildStore(client);
  stores.push(store);
  return {
    store,
    ...render(
      <StrictMode>
        <Provider store={store}>
          <AssignedRunWorkspace
            tenantId={TENANT_ID}
            signInHref="/bff/login"
            renderWorkspace={({ toolbar, content, statusLabel }) => (
              <>
                <header>
                  <p>{statusLabel}</p>
                  {toolbar}
                </header>
                <main>{content}</main>
              </>
            )}
          />
        </Provider>
      </StrictMode>,
    ),
  };
}
function deferred<A>() {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
