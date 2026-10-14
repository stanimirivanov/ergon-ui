import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type RunSupervisionClient,
  type RunApprovalClient,
  type RunApprovalResult,
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

const REQUEST_ID = '77777777-7777-4777-8777-777777777777';
const review = {
  status: 'PENDING',
  observedAt: '2026-10-14T12:00:00Z',
  canDecide: true,
  request: {
    requestId: REQUEST_ID,
    authority: 'RESOLVER',
    requestedAt: '2026-10-14T11:55:00Z',
    expiresAt: '2026-10-14T12:10:00Z',
    recordedAt: '2026-10-14T11:55:01Z',
  },
  decision: null,
} as const;
const stores: ReturnType<typeof createStore>[] = [];
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  // Only lifecycle is doubled; real modality and keyboard containment belong to Chromium evidence.
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
describe('confirmed human approval', () => {
  it('requires acknowledgement and cancelling restores focus without sending a decision', async () => {
    const client = successfulClient();
    const send = vi.spyOn(client, 'decideApproval');
    renderWorkspace(client);
    await openConfirmation();
    const confirmation = screen.getByRole('dialog');
    expect(
      within(confirmation).getByText(assignedRunConsole.capability),
    ).toBeTruthy();
    expect(within(confirmation).getByText(REQUEST_ID)).toBeTruthy();
    expect(screen.getByText('Assigned · approval enabled')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Acknowledge the decision boundary',
    );
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel decision' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Approve prerequisite' }),
    );
  });
  it('hides the entire private snapshot and focuses persistent content before one StrictMode command', async () => {
    const held = deferred<RunApprovalResult>();
    const client = successfulClient();
    const send = vi.spyOn(client, 'decideApproval').mockImplementation(() => {
      expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
      expect(
        screen.queryByRole('list', { name: 'Active assigned runs' }),
      ).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: /^Resolution run$/ }),
      );
      return held.promise;
    });
    const list = vi.spyOn(client, 'listAssigned');
    renderWorkspace(client);
    await openConfirmation();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(
      screen.getByRole('heading', { name: 'Recording human decision…' }),
    ).toBeTruthy();
    const command = send.mock.calls[0]?.[0];
    expect(command).toMatchObject({
      requestId: REQUEST_ID,
      expectedSupervisionRevision: 7,
      outcome: 'APPROVED',
    });
    if (command === undefined) throw new Error('command missing');
    held.resolve({
      ok: true,
      receipt: {
        ...command,
        supervisionRevision: 7,
        decisionId: REQUEST_ID,
        decidedAt: review.observedAt,
        recordedAt: review.observedAt,
      },
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Human decision recorded · APPROVED',
      }),
    ).toBeTruthy();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
    expect(send).toHaveBeenCalledOnce();
  });
  it('replays an uncertain original rejection without changing outcome, command or epoch', async () => {
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'decideApproval')
      .mockResolvedValueOnce({ ok: false, error: { kind: 'timeout' } });
    renderWorkspace(client);
    await openConfirmation('Reject prerequisite');
    await confirm('Record rejection');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry exact decision' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Human decision recorded · REJECTED',
      }),
    ).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });
  it('requires revalidation instead of replay for a definite authority or epoch conflict', async () => {
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'decideApproval')
      .mockResolvedValue({ ok: false, error: { kind: 'approval-conflict' } });
    const read = vi.spyOn(client, 'getConsole');
    renderWorkspace(client);
    await openConfirmation();
    await confirm();
    const recovery = await screen.findByRole('button', {
      name: 'Recheck run before deciding again',
    });
    expect(
      screen.queryByRole('button', { name: 'Retry exact decision' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
    fireEvent.click(recovery);
    expect(
      await screen.findByRole('button', { name: 'Approve prerequisite' }),
    ).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledOnce();
  });
  it('retires late form validation and mutation callbacks when the workspace leaves', async () => {
    const client = successfulClient();
    const send = vi.spyOn(client, 'decideApproval');
    const view = renderWorkspace(client);
    await openConfirmation();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /I understand this records/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(send).not.toHaveBeenCalled();
  });
  it('withdraws an open confirmation on revalidation and cannot resurrect its old approval selection', async () => {
    const client = successfulClient();
    const view = renderWorkspace(client);
    await openConfirmation();
    const read = vi.spyOn(client, 'getConsole').mockResolvedValue({
      ok: true,
      console: {
        ...assignedRunConsole,
        supervisionRevision: 7,
        handoverSupported: false,
        approvalReview: { ...review, canDecide: false },
      },
    });
    await act(async () => {
      view.store.dispatch(
        runSupervisionApi.util.invalidateTags([
          { type: 'RunDetail', id: `${TENANT_ID}:${RUN_ID}` },
        ]),
      );
    });
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect(
      await screen.findByText(/Decision unavailable for this snapshot/),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Record approval' }),
    ).toBeNull();
  });
});
async function openConfirmation(name = 'Approve prerequisite'): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  fireEvent.click(await screen.findByRole('button', { name }));
  expect(await screen.findByRole('dialog')).toBeTruthy();
}
async function confirm(name = 'Record approval'): Promise<void> {
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I understand this records/ }),
  );
  fireEvent.click(screen.getByRole('button', { name }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
function successfulClient(): RunSupervisionClient & RunApprovalClient {
  return {
    listAssigned: async () => ({ ok: true, page: assignedPage() }),
    getConsole: async () => ({
      ok: true,
      console: {
        ...assignedRunConsole,
        policyRevision: 'PRIVATE_RUN_POLICY',
        supervisionRevision: 7,
        handoverSupported: false,
        approvalReview: review,
      },
    }),
    decideApproval: async (command) => ({
      ok: true,
      receipt: {
        commandId: command.commandId,
        runId: command.runId,
        requestId: command.requestId,
        supervisionRevision: command.expectedSupervisionRevision,
        decisionId: REQUEST_ID,
        outcome: command.outcome,
        decidedAt: review.observedAt,
        recordedAt: review.observedAt,
      },
    }),
  };
}
function createStore(client: RunSupervisionClient & RunApprovalClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: { runSupervision: client } } }).concat(
        runSupervisionApi.middleware,
      ),
  });
}
function renderWorkspace(client: RunSupervisionClient & RunApprovalClient) {
  const store = createStore(client);
  stores.push(store);
  const view = render(
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
  );
  return { ...view, store };
}
function deferred<A>() {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
