import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type AssignedRunConsoleResult,
  type AssignedRunListResult,
  type RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import type { WorkspaceRenderer } from '@ergon/ui-web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssignedRunWorkspace } from '../src';
import {
  assignedPage,
  assignedRunConsole,
  ASSIGNED_AT,
  RUN_ID,
  SECOND_RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

const stores: ReturnType<typeof createStore>[] = [];
const signInHref = '/bff/login?returnTo=%2Ftenants%2Ftest';
const renderTestShell: WorkspaceRenderer = ({
  mode,
  statusLabel,
  toolbar,
  content,
}) => (
  <div data-workbench-mode={mode}>
    <header>
      <h1>Resolver Console</h1>
      <p>{statusLabel}</p>
      {toolbar}
    </header>
    <main>{content}</main>
  </div>
);

afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
});

describe('assigned-run Resolver Console', () => {
  it('keeps named discovery, execution and outcome panes while the app owns chrome and toolbar placement', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole });
    renderWorkspace({ ...successfulClient(), getConsole });

    const assertComposition = () => {
      const main = screen.getByRole('main');
      const banner = screen.getByRole('banner');
      expect(
        within(banner).getByRole('heading', {
          level: 1,
          name: 'Resolver Console',
        }),
      ).toBeTruthy();
      expect(within(banner).getByText('Assigned · read only')).toBeTruthy();
      expect(
        within(banner).getByRole('region', { name: 'Supervisor presence' }),
      ).toBeTruthy();
      expect(
        within(main).queryByRole('region', { name: 'Supervisor presence' }),
      ).toBeNull();
      expect(screen.queryByText('Ergon')).toBeNull();
      for (const [name, slot] of [
        ['Assigned runs', 'leading'],
        ['Resolution run', 'primary'],
        ['Outcome proof', 'trailing'],
      ] as const) {
        expect(
          within(main)
            .getByRole('region', { name })
            .closest('[data-pane-slot]')
            ?.getAttribute('data-pane-slot'),
        ).toBe(slot);
      }
    };

    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
    assertComposition();
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Loading run context…' }),
    ).toBeTruthy();
    assertComposition();
    held.resolve({ ok: false, error: { kind: 'not-found' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Run context is unavailable',
      }),
    ).toBeTruthy();
    assertComposition();
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    expect(
      screen.getByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    assertComposition();
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    await loadedRunPane();
    assertComposition();
  });

  it('renders only recorded facts with read-only policy disclosure and no fabricated execution controls', async () => {
    const client = successfulClient();
    renderWorkspace(client);

    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    expect(client.getConsole).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );

    const runPane = await loadedRunPane();
    expect(within(runPane).getByText('access-restoration')).toBeTruthy();
    expect(
      within(runPane).getByText(/Pinned step · restore-access/),
    ).toBeTruthy();
    expect(
      within(runPane).getByText('Execution detail unavailable'),
    ).toBeTruthy();
    fireEvent.click(
      within(runPane).getByText('Inspect recorded execution policy'),
    );
    expect(within(runPane).getByText('workspace-access.update')).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: 'Outcome is not established by this view',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Verification checks and accepted proof are not included in this read model.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /authorize|steer|handover/i }),
    ).toBeNull();
    expect(screen.queryByText(/remaining|elapsed/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Verified fact' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      document.activeElement,
    );
    expect(client.getConsole).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, runId: RUN_ID },
      expect.any(AbortSignal),
    );
  });

  it('hides retained detail while exact-run access is rechecked, fails closed, and recovers explicitly', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const measuredConsole = {
      ...assignedRunConsole,
      execution: {
        stepId: assignedRunConsole.stepId,
        capability: assignedRunConsole.capability,
        connector: 'measured-access-gateway',
        outcome: 'SUCCEEDED' as const,
        completedAt: '2026-10-09T10:01:00Z',
        recordedAt: '2026-10-09T10:01:01Z',
        timing: {
          source: 'ergon.dev/measurement/connector-call/v1' as const,
          startedAt: '2026-10-09T10:00:59Z',
          elapsedNanoseconds: '305123456',
        },
      },
    };
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: measuredConsole })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({ ok: true, console: measuredConsole });
    renderWorkspace({ ...successfulClient(), getConsole });
    await openRun();
    expect(screen.getByText('305.123456 ms')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(screen.queryByText('measured-access-gateway')).toBeNull();
    expect(screen.queryByText('305.123456 ms')).toBeNull();

    expect(
      await screen.findByRole('heading', { name: 'Rechecking run access…' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(screen.queryByText('access-policy-7')).toBeNull();
    held.resolve({
      ok: false,
      error: { kind: 'service-unavailable', status: 503 },
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Run context could not be read',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry run read' }));
    await loadedRunPane();
    expect(getConsole).toHaveBeenCalledTimes(3);
  });

  it('commits private-detail hiding before synchronous exact and discovery recheck I/O', async () => {
    const client = successfulClient();
    const getConsole = vi.fn<RunSupervisionClient['getConsole']>(async () => {
      expect(screen.queryByText('access-restoration')).toBeNull();
      expect(screen.queryByText('access-policy-7')).toBeNull();
      return { ok: true, console: assignedRunConsole };
    });
    const listAssigned = vi.fn<RunSupervisionClient['listAssigned']>(
      async () => {
        expect(screen.queryByText('access-restoration')).toBeNull();
        expect(screen.queryByText('access-policy-7')).toBeNull();
        return { ok: true, page: assignedPage() };
      },
    );
    renderWorkspace({ ...client, getConsole, listAssigned });
    await openRun();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    await loadedRunPane();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck assigned runs' }),
    );
    await loadedRunPane();
    expect(listAssigned).toHaveBeenCalledTimes(2);
    expect(getConsole).toHaveBeenCalledTimes(3);
  });

  it('moves explicit recheck focus to the persistent run heading through pending, failed and successful reads', async () => {
    const failedRead = deferred<AssignedRunConsoleResult>();
    const recoveryRead = deferred<AssignedRunConsoleResult>();
    const successfulRead = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockImplementationOnce(() => failedRead.promise)
      .mockImplementationOnce(() => recoveryRead.promise)
      .mockImplementationOnce(() => successfulRead.promise);
    renderWorkspace({ ...successfulClient(), getConsole });
    await openRun();
    const heading = screen.getByRole('heading', { name: 'Resolution run' });

    const startRecheck = async () => {
      const recheck = screen.getByRole('button', {
        name: 'Recheck selected run',
      });
      recheck.focus();
      expect(document.activeElement).toBe(recheck);
      fireEvent.click(recheck);
      expect(
        await screen.findByRole('heading', { name: 'Rechecking run access…' }),
      ).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        heading,
      );
      expect(document.activeElement).toBe(heading);
      expect(screen.queryByText('access-restoration')).toBeNull();
      expect(screen.queryByText('access-policy-7')).toBeNull();
    };

    await startRecheck();
    failedRead.resolve({
      ok: false,
      error: { kind: 'service-unavailable', status: 503 },
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Run context could not be read',
      }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(heading);
    const retry = screen.getByRole('button', { name: 'Retry run read' });
    retry.focus();
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      heading,
    );
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(screen.queryByText('access-policy-7')).toBeNull();
    recoveryRead.resolve({ ok: true, console: assignedRunConsole });
    await loadedRunPane();
    await startRecheck();
    successfulRead.resolve({ ok: true, console: assignedRunConsole });
    await loadedRunPane();
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      heading,
    );
    expect(document.activeElement).toBe(heading);
    expect(getConsole).toHaveBeenCalledTimes(4);
  });

  it('keeps discovery recheck and recovery focus on the run heading while selected records are withdrawn', async () => {
    const heldAssignments = deferred<AssignedRunListResult>();
    const heldDetail = deferred<AssignedRunConsoleResult>();
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValueOnce({ ok: true, page: assignedPage() })
      .mockImplementationOnce(() => heldAssignments.promise)
      .mockResolvedValueOnce({ ok: true, page: assignedPage() });
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockImplementationOnce(() => heldDetail.promise);
    renderWorkspace({ listAssigned, getConsole });
    await openRun();
    const heading = screen.getByRole('heading', { name: 'Resolution run' });
    const recheck = screen.getByRole('button', {
      name: 'Recheck assigned runs',
    });
    recheck.focus();
    expect(document.activeElement).toBe(recheck);
    fireEvent.click(recheck);
    expect(
      await screen.findByRole('heading', { name: 'Run context hidden' }),
    ).toBeTruthy();
    expect(
      screen.queryByText(/Retry assigned runs to recheck access/u),
    ).toBeNull();
    expect(
      screen.getByText(
        /Check the assigned-work pane for access status and any available recovery/u,
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(screen.queryByText('access-policy-7')).toBeNull();

    heldAssignments.resolve({ ok: false, error: { kind: 'transport' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Assigned runs could not be read',
      }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(heading);
    const retry = screen.getByRole('button', { name: 'Retry assigned runs' });
    retry.focus();
    fireEvent.click(retry);
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      heading,
    );
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByText('access-restoration')).toBeNull();
    heldDetail.resolve({ ok: true, console: assignedRunConsole });
    await loadedRunPane();
    expect(document.activeElement).toBe(heading);
    expect(listAssigned).toHaveBeenCalledTimes(3);
  });

  it('never reopens retired detail after switching tenant during a held read', async () => {
    const old = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => old.promise);
    const client = { ...successfulClient(), getConsole };
    const store = createStore(client);
    stores.push(store);
    const view = render(
      <Provider store={store}>
        <AssignedRunWorkspace
          tenantId={TENANT_ID}
          signInHref={signInHref}
          renderWorkspace={renderTestShell}
        />
      </Provider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(1));
    view.rerender(
      <Provider store={store}>
        <AssignedRunWorkspace
          tenantId={SECOND_RUN_ID}
          signInHref={signInHref}
          renderWorkspace={renderTestShell}
        />
      </Provider>,
    );
    await waitFor(() =>
      expect(getConsole.mock.calls[0]?.[1].aborted).toBe(true),
    );
    old.resolve({ ok: true, console: assignedRunConsole });
    expect(
      await screen.findByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(getConsole).toHaveBeenCalledTimes(1);
  });

  it('unmounts private detail during failed assignment revalidation and preserves selection only as retry intent', async () => {
    const held = deferred<AssignedRunListResult>();
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValueOnce({ ok: true, page: assignedPage() })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({ ok: true, page: assignedPage() });
    const client = { ...successfulClient(), listAssigned };
    const store = renderWorkspace(client);
    await openRun();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck assigned runs' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Run context hidden' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    held.resolve({ ok: false, error: { kind: 'transport' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Assigned runs could not be read',
      }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        runSupervisionApi.endpoints.getAssignedRunConsole.select({
          tenantId: TENANT_ID,
          runId: RUN_ID,
        })(store.getState()).data,
      ).toBeUndefined(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry assigned runs' }),
    );
    await loadedRunPane();
    expect(client.getConsole).toHaveBeenCalledTimes(2);
  });

  it('keeps a selected terminal run inspectable after active discovery becomes empty', async () => {
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValueOnce({ ok: true, page: assignedPage() })
      .mockResolvedValue({ ok: true, page: { entries: [], nextCursor: null } });
    const terminal = {
      ...assignedRunConsole,
      state: 'VERIFIED_RESOLVED',
      stateVersion: 4,
    } as const;
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockResolvedValue({ ok: true, console: terminal });
    renderWorkspace({ listAssigned, getConsole });
    await openRun();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Recorded terminal state · proof not included',
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck assigned runs' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'No active assigned runs' }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('heading', {
        name: 'Recorded terminal state · proof not included',
      }),
    ).toBeTruthy();
    expect(getConsole).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(/outcome verified by browser/i)).toBeNull();
  });

  it('evicts detail on close and requests fresh exact-run access on reopen, keeping absence neutral', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'not-found' } });
    const store = renderWorkspace({ ...successfulClient(), getConsole });
    await openRun();
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    expect(
      screen.getByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        runSupervisionApi.endpoints.getAssignedRunConsole.select({
          tenantId: TENANT_ID,
          runId: RUN_ID,
        })(store.getState()).data,
      ).toBeUndefined(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Run context is unavailable',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/does not disclose whether the run exists/i),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(getConsole).toHaveBeenCalledTimes(2);
  });

  it('does not flash the prior private payload on immediate close and reopen before eviction settles', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockImplementationOnce(() => held.promise);
    renderWorkspace({ ...successfulClient(), getConsole });
    await openRun();
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(
      await screen.findByRole('heading', {
        name: /Loading run context|Rechecking run access/,
      }),
    ).toBeTruthy();
    expect(screen.queryByText('access-policy-7')).toBeNull();
    held.resolve({ ok: false, error: { kind: 'not-found' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Run context is unavailable',
      }),
    ).toBeTruthy();
  });

  it('retires a pending pre-close read before immediate same-run reopen starts a distinct access check', async () => {
    const oldRead = deferred<AssignedRunConsoleResult>();
    const newRead = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockImplementationOnce(() => oldRead.promise)
      .mockImplementationOnce(() => newRead.promise);
    renderWorkspace({ ...successfulClient(), getConsole });
    fireEvent.click(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    fireEvent.click(
      screen.getByRole('button', { name: `Inspect run ${RUN_ID}` }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    expect(getConsole.mock.calls[0]?.[1].aborted).toBe(true);
    oldRead.resolve({ ok: true, console: assignedRunConsole });
    expect(screen.queryByText('access-restoration')).toBeNull();
    newRead.resolve({
      ok: true,
      console: {
        ...assignedRunConsole,
        contractKey: 'freshly-authorized-contract',
      },
    });
    expect(await screen.findByText('freshly-authorized-contract')).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
  });

  it('starts a usable exact-run read under StrictMode without aborting its replacement', async () => {
    const client = successfulClient();
    const store = createStore(client);
    stores.push(store);
    render(
      <StrictMode>
        <Provider store={store}>
          <AssignedRunWorkspace
            tenantId={TENANT_ID}
            signInHref={signInHref}
            renderWorkspace={renderTestShell}
          />
        </Provider>
      </StrictMode>,
    );
    await openRun();
    expect(client.getConsole).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('heading', { name: 'Run context could not be read' }),
    ).toBeNull();
  });

  it('traverses paired assignment cursors without inheriting the previous selected-run response', async () => {
    const cursor = {
      assignedAt: ASSIGNED_AT,
      assignmentId: '55555555-5555-4555-8555-555555555555',
    };
    const listAssigned = vi.fn<RunSupervisionClient['listAssigned']>(
      async (query) => ({
        ok: true,
        page:
          query.cursor === undefined
            ? { ...assignedPage(), nextCursor: cursor }
            : assignedPage(SECOND_RUN_ID),
      }),
    );
    const held = deferred<AssignedRunConsoleResult>();
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValue({
        ok: true,
        console: {
          ...assignedRunConsole,
          runId: SECOND_RUN_ID,
          contractKey: 'second-contract',
        },
      });
    renderWorkspace({ listAssigned, getConsole });
    await openRun();
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next assigned page' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Inspect run ${SECOND_RUN_ID}`,
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Loading run context…' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(listAssigned).toHaveBeenLastCalledWith(
      { tenantId: TENANT_ID, cursor },
      expect.any(AbortSignal),
    );
    held.resolve({
      ok: true,
      console: {
        ...assignedRunConsole,
        runId: SECOND_RUN_ID,
        contractKey: 'second-contract',
      },
    });
    expect(await screen.findByText('second-contract')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Previous assigned page' }),
    );
    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
  });

  it('resets a rejected assigned traversal to a fresh first-page read', async () => {
    const cursor = {
      assignedAt: ASSIGNED_AT,
      assignmentId: '55555555-5555-4555-8555-555555555555',
    };
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValueOnce({
        ok: true,
        page: { ...assignedPage(), nextCursor: cursor },
      })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'invalid-page' } })
      .mockResolvedValueOnce({ ok: true, page: assignedPage() });
    renderWorkspace({ ...successfulClient(), listAssigned });
    await openRun();
    fireEvent.click(screen.getByRole('button', { name: 'Next assigned page' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Return to first assigned page',
      }),
    );
    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
    expect(listAssigned).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(listAssigned.mock.calls[1]?.[0]).toEqual({
      tenantId: TENANT_ID,
      cursor,
    });
    expect(listAssigned.mock.calls[2]?.[0]).toEqual({ tenantId: TENANT_ID });
    expect(
      screen.getByRole('button', { name: 'Previous assigned page' }),
    ).toHaveProperty('disabled', true);
  });

  it('keeps focus on the execution heading while resetting a rejected first assigned page', async () => {
    const held = deferred<AssignedRunListResult>();
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'invalid-page' } })
      .mockImplementationOnce(() => held.promise);
    const client = { ...successfulClient(), listAssigned };
    renderWorkspace(client);
    const reset = await screen.findByRole('button', {
      name: 'Return to first assigned page',
    });
    const heading = screen.getByRole('heading', {
      name: 'Resolution run',
    });
    reset.focus();
    expect(document.activeElement).toBe(reset);
    fireEvent.click(reset);
    expect(document.activeElement).toBe(heading);
    await waitFor(() => expect(listAssigned).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole('heading', { name: 'Loading assigned runs…' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Return to first assigned page' }),
    ).toBeNull();
    expect(document.activeElement).toBe(heading);
    expect(client.getConsole).not.toHaveBeenCalled();

    held.resolve({ ok: true, page: assignedPage() });
    expect(
      await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      heading,
    );
    expect(document.activeElement).toBe(heading);
    expect(
      screen.getByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(client.getConsole).not.toHaveBeenCalled();
    expect(listAssigned.mock.calls.map(([query]) => query)).toEqual([
      { tenantId: TENANT_ID },
      { tenantId: TENANT_ID },
    ]);
  });

  it('hides retained detail after a defect and retries only on explicit intent', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole })
      .mockRejectedValueOnce(new Error('private sentinel'))
      .mockResolvedValueOnce({ ok: true, console: assignedRunConsole });
    renderWorkspace({ ...successfulClient(), getConsole });
    await openRun();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(
      await screen.findByText(/unexpected problem while reading this snapshot/),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(screen.queryByText('access-policy-7')).toBeNull();
    expect(screen.queryByText(/private sentinel/)).toBeNull();
    expect(getConsole).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Retry run read' }));
    await loadedRunPane();
    expect(getConsole).toHaveBeenCalledTimes(3);
  });

  it('uses only the app-composed sign-in URL and starts a tenant switch with no retained selection', async () => {
    const client = successfulClient();
    const store = renderWorkspace(client);
    await openRun();
    cleanup();
    render(
      <Provider store={store}>
        <AssignedRunWorkspace
          tenantId={SECOND_RUN_ID}
          signInHref={signInHref}
          renderWorkspace={renderTestShell}
        />
      </Provider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Select an assigned run' }),
    ).toBeTruthy();
    expect(screen.queryByText('access-restoration')).toBeNull();
    expect(client.getConsole).toHaveBeenCalledTimes(1);
    cleanup();
    renderWorkspace({
      ...successfulClient(),
      listAssigned: async () => ({
        ok: false,
        error: { kind: 'authentication-required' },
      }),
    });
    const link = await screen.findByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe(signInHref);
  });
});

function successfulClient(): RunSupervisionClient {
  return {
    listAssigned: vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValue({ ok: true, page: assignedPage() }),
    getConsole: vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValue({ ok: true, console: assignedRunConsole }),
  };
}

function createStore(client: RunSupervisionClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: { runSupervision: client } },
      }).concat(runSupervisionApi.middleware),
  });
}

function renderWorkspace(client: RunSupervisionClient) {
  const store = createStore(client);
  stores.push(store);
  render(
    <Provider store={store}>
      <AssignedRunWorkspace
        tenantId={TENANT_ID}
        signInHref={signInHref}
        presence={<span>Verified test actor</span>}
        renderWorkspace={renderTestShell}
      />
    </Provider>,
  );
  return store;
}

async function openRun(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  await loadedRunPane();
}

async function loadedRunPane(): Promise<HTMLElement> {
  await screen.findByText('access-restoration');
  return screen.getByRole('region', { name: 'Resolution run' });
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => {
    throw new Error('Deferred promise was not initialized');
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
