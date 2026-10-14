import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type RunSupervisionClient,
  type RunSupervisorHandoverClient,
  type RunSupervisorHandoverResult,
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
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignedRunWorkspace } from '../src';
import {
  assignedPage,
  assignedRunConsole,
  RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

const RECIPIENT = '66666666-6666-4666-8666-666666666666';
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
  // Lifecycle double only; actual inertness, focus containment and reflow are verified in Chromium.
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

describe('confirmed run supervisor handover', () => {
  it('requires recipient and explicit acknowledgement, and cancel restores the invoking control without a command', async () => {
    const client = successfulClient();
    const send = vi.spyOn(client, 'handoverSupervisor');
    renderWorkspace(client);
    await openForm();
    const dialog = screen.getByRole('dialog', {
      name: 'Hand over supervision',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm handover' }),
    );
    expect(
      await within(dialog).findByText('Choose an eligible recipient.'),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(
        'Confirm that your supervision access will be transferred.',
      ),
    ).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel handover' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Hand over supervision' }),
    );
  });

  it('commits hidden context and persistent focus before a single held command under StrictMode', async () => {
    const held = deferred<RunSupervisorHandoverResult>();
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'handoverSupervisor')
      .mockImplementation(() => {
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
    const list = vi
      .spyOn(client, 'listAssigned')
      .mockResolvedValueOnce({ ok: true, page: assignedPage() })
      .mockResolvedValue({ ok: true, page: { entries: [], nextCursor: null } });
    renderWorkspace(client);
    await openForm();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(
      screen.getByRole('heading', { name: 'Transferring supervision…' }),
    ).toBeTruthy();
    const command = send.mock.calls[0]?.[0];
    if (command === undefined) throw new Error('Expected a captured handover');
    await act(async () =>
      held.resolve({ ok: true, receipt: receipt(command.commandId) }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Supervision handover recorded',
      }),
    ).toBeTruthy();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', {
        name: /^No active assigned runs$/,
      }),
    ).toBeTruthy();
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
  });

  it('retains the exact command after an unexpected defect and never retries until explicitly requested', async () => {
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'handoverSupervisor')
      .mockRejectedValueOnce(new Error('PRIVATE_HANDOVER_CAUSE'))
      .mockImplementation(async (command) => ({
        ok: true,
        receipt: receipt(command.commandId),
      }));
    const store = renderWorkspace(client);
    await openForm();
    await confirm();
    const retry = await screen.findByRole('button', {
      name: 'Retry exact handover',
    });
    expect(send).toHaveBeenCalledOnce();
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
    expect(JSON.stringify(store.getState())).not.toContain(
      'PRIVATE_HANDOVER_CAUSE',
    );
    fireEvent.click(retry);
    expect(
      await screen.findByRole('heading', {
        name: 'Supervision handover recorded',
      }),
    ).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });

  it('requires fresh run recovery after a definite stale-epoch conflict instead of replaying an obsolete command', async () => {
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'handoverSupervisor')
      .mockResolvedValue({ ok: false, error: { kind: 'handover-conflict' } });
    const getConsole = vi.spyOn(client, 'getConsole');
    renderWorkspace(client);
    await openForm();
    await confirm();
    const recover = await screen.findByRole('button', {
      name: 'Recheck run before choosing again',
    });
    expect(
      screen.queryByRole('button', { name: 'Retry exact handover' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
    fireEvent.click(recover);
    expect(await screen.findByText('PRIVATE_RUN_POLICY')).toBeTruthy();
    expect(getConsole).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledOnce();
  });

  it('retires a held command callback when its tenant workspace unmounts', async () => {
    const held = deferred<RunSupervisorHandoverResult>();
    const client = successfulClient();
    const send = vi
      .spyOn(client, 'handoverSupervisor')
      .mockImplementation(() => held.promise);
    const store = createStore(client);
    const mounted = render(
      <Provider store={store}>
        <Workspace tenantId={TENANT_ID} />
      </Provider>,
    );
    await openForm();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    const command = send.mock.calls[0]?.[0];
    if (command === undefined) throw new Error('Expected a captured handover');
    mounted.rerender(
      <Provider store={store}>
        <Workspace tenantId="99999999-9999-4999-8999-999999999999" />
      </Provider>,
    );
    await act(async () =>
      held.resolve({ ok: true, receipt: receipt(command.commandId) }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Supervision handover recorded' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
  });
});

describe('recipient access withdrawal', () => {
  it.each(['not-found', 'handover-conflict', 'transport'] as const)(
    'withdraws the earlier run and directory on a %s candidate failure without sending a command',
    async (kind) => {
      const client = successfulClient();
      vi.spyOn(client, 'listHandoverCandidates').mockResolvedValue({
        ok: false,
        error: { kind },
      });
      const send = vi.spyOn(client, 'handoverSupervisor');
      renderWorkspace(client);
      fireEvent.click(
        await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
      );
      fireEvent.click(
        await screen.findByRole('button', { name: 'Hand over supervision' }),
      );
      expect(
        await screen.findByRole('heading', {
          name: 'Recipient access unavailable',
        }),
      ).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('PRIVATE_RUN_POLICY')).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Retry exact handover' }),
      ).toBeNull();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: /^Resolution run$/ }),
      );
      expect(send).not.toHaveBeenCalled();
    },
  );
});

async function openForm(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Hand over supervision' }),
  );
  expect(
    await screen.findByRole('combobox', { name: 'Eligible recipient' }),
  ).toBeTruthy();
}
async function confirm(): Promise<void> {
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Eligible recipient' }),
    { target: { value: RECIPIENT } },
  );
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'I understand that my supervision access will be transferred to the selected resolver.',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm handover' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
function successfulClient(): RunSupervisionClient &
  RunSupervisorHandoverClient {
  return {
    listAssigned: async () => ({ ok: true, page: assignedPage() }),
    getConsole: async () => ({
      ok: true,
      console: {
        ...assignedRunConsole,
        policyRevision: 'PRIVATE_RUN_POLICY',
        supervisionRevision: 7,
        handoverSupported: true,
      },
    }),
    listHandoverCandidates: async () => ({
      ok: true,
      page: {
        entries: [{ actorId: RECIPIENT }],
        nextActorId: null,
        supervisionRevision: 7,
      },
    }),
    handoverSupervisor: async (command) => ({
      ok: true,
      receipt: receipt(command.commandId),
    }),
  };
}
function receipt(commandId: string) {
  return {
    commandId,
    runId: RUN_ID,
    supervisionRevision: 8,
    handedOverAt: '2026-10-14T08:00:00Z',
    recordedAt: '2026-10-14T08:00:01Z',
  };
}
function buildStore(
  client: RunSupervisionClient & RunSupervisorHandoverClient,
) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: { runSupervision: client } } }).concat(
        runSupervisionApi.middleware,
      ),
  });
}
function createStore(
  client: RunSupervisionClient & RunSupervisorHandoverClient,
) {
  const store = buildStore(client);
  stores.push(store);
  return store;
}
function renderWorkspace(
  client: RunSupervisionClient & RunSupervisorHandoverClient,
) {
  const store = createStore(client);
  render(
    <StrictMode>
      <Provider store={store}>
        <Workspace tenantId={TENANT_ID} />
      </Provider>
    </StrictMode>,
  );
  return store;
}
function Workspace({ tenantId }: { readonly tenantId: string }) {
  return (
    <AssignedRunWorkspace
      tenantId={tenantId}
      signInHref="/bff/login"
      renderWorkspace={({ toolbar, content }) => (
        <>
          <header>{toolbar}</header>
          <main>{content}</main>
        </>
      )}
    />
  );
}
function deferred<A>() {
  let resolve: (value: A | PromiseLike<A>) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
