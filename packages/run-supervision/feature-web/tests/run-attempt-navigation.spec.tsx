import { withDisabledRunControl } from './disabled-run-control';
import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type AssignedRunConsole,
  type AssignedRunConsoleResult,
  type RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssignedRunWorkspace } from '../src';
import {
  assignedPage,
  assignedRunConsole,
  RUN_ID,
  SECOND_RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

const successor: AssignedRunConsole = {
  ...assignedRunConsole,
  runId: SECOND_RUN_ID,
  attemptNumber: 2,
  predecessorRunId: RUN_ID,
  contractKey: 'successor-private-contract',
};
const predecessor: AssignedRunConsole = {
  ...assignedRunConsole,
  state: 'SUPERSEDED',
  stateVersion: 2,
  contractKey: 'predecessor-private-contract',
};
const stores: ReturnType<typeof createStore>[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
});

describe('fresh attempt navigation', () => {
  it('reads only on explicit intent, withdraws before I/O and returns through fresh terminal access', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: successor })
      .mockImplementationOnce(() => {
        expect(screen.queryByText(successor.contractKey)).toBeNull();
        expect(document.activeElement).toBe(
          screen.getByRole('heading', { name: 'Resolution run' }),
        );
        return held.promise;
      })
      .mockImplementationOnce(async () => {
        expect(screen.queryByText(predecessor.contractKey)).toBeNull();
        return {
          ok: true,
          console: { ...successor, state: 'ESCALATED', stateVersion: 2 },
        };
      });
    mount(getConsole);
    await openSuccessor();
    expect(getConsole).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect predecessor attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(successor.contractKey)).toBeNull();
    held.resolve({ ok: true, console: predecessor });
    await screen.findByText(predecessor.contractKey);
    expect(
      screen.getByText(
        'This is the initial attempt. No predecessor is recorded.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Inspect predecessor attempt' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to originating attempt' }),
    );
    await screen.findByText(successor.contractKey);
    expect(
      screen.queryByRole('button', { name: 'Return to originating attempt' }),
    ).toBeNull();
    expect(getConsole.mock.calls.map(([query]) => query)).toEqual([
      { tenantId: TENANT_ID, runId: SECOND_RUN_ID },
      { tenantId: TENANT_ID, runId: RUN_ID },
      { tenantId: TENANT_ID, runId: SECOND_RUN_ID },
    ]);
  });

  it('keeps predecessor denial neutral and never assumes return access', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: successor })
      .mockResolvedValue({ ok: false, error: { kind: 'not-found' } });
    mount(getConsole);
    await openSuccessor();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect predecessor attempt' }),
    );
    await screen.findByRole('heading', { name: 'Run context is unavailable' });
    expect(screen.queryByText(successor.contractKey)).toBeNull();
    expect(screen.queryByText(predecessor.contractKey)).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to originating attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(3));
    await screen.findByRole('heading', { name: 'Run context is unavailable' });
    expect(screen.queryByText(successor.contractKey)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Return to originating attempt' }),
    ).toBeNull();
  });

  it('retires a held predecessor read when returning and ignores its late payload', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: successor })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValue({
        ok: true,
        console: { ...successor, contractKey: 'fresh-return' },
      });
    mount(getConsole);
    await openSuccessor();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect predecessor attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to originating attempt' }),
    );
    await screen.findByText('fresh-return');
    await waitFor(() =>
      expect(getConsole.mock.calls[1]?.[1].aborted).toBe(true),
    );
    await act(async () => held.resolve({ ok: true, console: predecessor }));
    expect(screen.queryByText(predecessor.contractKey)).toBeNull();
    expect(screen.queryByText(successor.contractKey)).toBeNull();
  });

  it.each(['Close run', `Inspect run ${SECOND_RUN_ID}`])(
    'discards return intent on %s',
    async (label) => {
      const getConsole = vi.fn<RunSupervisionClient['getConsole']>(
        async (query) => ({
          ok: true,
          console: query.runId === RUN_ID ? predecessor : successor,
        }),
      );
      mount(getConsole);
      await openSuccessor();
      fireEvent.click(
        screen.getByRole('button', { name: 'Inspect predecessor attempt' }),
      );
      await screen.findByText(predecessor.contractKey);
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(
        screen.queryByRole('button', { name: 'Return to originating attempt' }),
      ).toBeNull();
      if (label === 'Close run') {
        expect(
          screen.getByRole('heading', { name: 'Select an assigned run' }),
        ).toBeTruthy();
      } else {
        await screen.findByText(successor.contractKey);
      }
    },
  );

  it('retires predecessor navigation and its return identity on tenant change', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: successor })
      .mockImplementationOnce(() => held.promise);
    const { view, store } = mount(getConsole);
    await openSuccessor();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect predecessor attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    view.rerender(workspace(store, SECOND_RUN_ID));
    await screen.findByRole('heading', { name: 'Select an assigned run' });
    await waitFor(() =>
      expect(getConsole.mock.calls[1]?.[1].aborted).toBe(true),
    );
    await act(async () => held.resolve({ ok: true, console: predecessor }));
    expect(
      screen.queryByRole('button', { name: 'Return to originating attempt' }),
    ).toBeNull();
    expect(screen.queryByText(predecessor.contractKey)).toBeNull();
  });
});

function createStore(client: RunSupervisionClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({
        thunk: {
          extraArgument: { runSupervision: withDisabledRunControl(client) },
        },
      }).concat(runSupervisionApi.middleware),
  });
}
function workspace(store: ReturnType<typeof createStore>, tenantId: string) {
  return (
    <StrictMode>
      <Provider store={store}>
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
      </Provider>
    </StrictMode>
  );
}
function mount(getConsole: RunSupervisionClient['getConsole']) {
  const store = createStore({
    listAssigned: async () => ({ ok: true, page: assignedPage(SECOND_RUN_ID) }),
    getConsole,
  });
  stores.push(store);
  return { store, view: render(workspace(store, TENANT_ID)) };
}
async function openSuccessor(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${SECOND_RUN_ID}` }),
  );
  await screen.findByText(successor.contractKey);
}
function deferred<A>() {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
