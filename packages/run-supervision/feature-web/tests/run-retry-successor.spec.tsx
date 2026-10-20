import type {
  AssignedRunConsoleResult,
  RunControlClient,
  RunRetrySuccessorClient,
  RunRetrySuccessorResult,
} from '@ergon/run-supervision-data-access-web';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RUN_ID,
  SECOND_RUN_ID,
  TENANT_ID,
  assignedRunConsole,
} from './assigned-run-fixtures';
import {
  deferred,
  failedConsole,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();
const value = {
  observedAt: '2026-10-20T08:00:00Z',
  supervisionRevision: 7,
  successor: { runId: SECOND_RUN_ID, supervisionRevision: 0 },
};
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
  );
  await screen.findByRole('button', { name: 'Find visible retry successor' });
}
async function findSuccessor(): Promise<void> {
  fireEvent.click(
    screen.getByRole('button', { name: 'Find visible retry successor' }),
  );
  await screen.findByText('Visible direct successor');
}

describe('protected successor navigation', () => {
  it('is lazy and lease-free, hides before target I/O, and freshly returns to the source', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const read = vi
      .fn<RunRetrySuccessorClient['getRetrySuccessor']>()
      .mockResolvedValue({ ok: true, value });
    const base = successfulRetryClient();
    const write = vi.spyOn(base, 'retryRun');
    const change = vi.fn<RunControlClient['changeRunControl']>();
    const getRunControl: RunControlClient['getRunControl'] = async (query) => ({
      ok: true,
      value: {
        status: 'AVAILABLE',
        supervisionRevision: query.expectedSupervisionRevision,
        observedAt: value.observedAt,
      },
    });
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockImplementationOnce(() => {
        expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
        expect(document.activeElement).toBe(
          screen.getByRole('heading', { name: 'Resolution run' }),
        );
        return held.promise;
      })
      .mockResolvedValue({ ok: true, console: failedConsole });
    renderRetryWorkspace({
      ...base,
      getConsole,
      getRetrySuccessor: read,
      getRunControl,
      changeRunControl: change,
    });
    await select();
    expect(read).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    await findSuccessor();
    expect(read.mock.calls[0]?.[0]).toEqual({
      tenantId: TENANT_ID,
      runId: RUN_ID,
      expectedSupervisionRevision: 7,
    });
    expect(getConsole).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect successor attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(2));
    await act(async () =>
      held.resolve({
        ok: true,
        console: {
          ...assignedRunConsole,
          runId: SECOND_RUN_ID,
          attemptNumber: 2,
          predecessorRunId: RUN_ID,
          supervisionRevision: 5,
          state: 'ESCALATED',
          stateVersion: 2,
          policyRevision: 'FRESH_TARGET_POLICY',
        },
      }),
    );
    await screen.findByText('FRESH_TARGET_POLICY');
    // A newer independently authorized epoch is valid; the relationship is not a target precondition.
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to originating attempt' }),
    );
    await screen.findByText('PRIVATE_FAILED_POLICY');
    expect(getConsole.mock.calls.map(([query]) => query.runId)).toEqual([
      RUN_ID,
      SECOND_RUN_ID,
      RUN_ID,
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it('withholds old coordinates during held recheck and withdraws all private context on denial before fresh recovery', async () => {
    const held = deferred<RunRetrySuccessorResult>();
    const read = vi
      .fn<RunRetrySuccessorClient['getRetrySuccessor']>()
      .mockResolvedValueOnce({ ok: true, value })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({ ok: true, value });
    const base = successfulRetryClient();
    const getConsole = vi.spyOn(base, 'getConsole');
    renderRetryWorkspace({ ...base, getRetrySuccessor: read });
    await select();
    await findSuccessor();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck successor access' }),
    );
    expect(
      screen.queryByRole('button', { name: 'Inspect successor attempt' }),
    ).toBeNull();
    expect(screen.queryByText('Run ' + SECOND_RUN_ID)).toBeNull();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      held.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await screen.findByText('Successor lookup unavailable');
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Inspect run ' + RUN_ID }),
    ).toBeNull();
    expect(
      screen.queryByText('No currently visible direct successor'),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Resolution run' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Recheck run access' }));
    await screen.findByRole('button', { name: 'Find visible retry successor' });
    expect(getConsole).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
    await findSuccessor();
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('distinguishes visible absence and unsupported servers and performs a fresh read on reopening', async () => {
    const read = vi
      .fn<RunRetrySuccessorClient['getRetrySuccessor']>()
      .mockResolvedValueOnce({ ok: true, value: { ...value, successor: null } })
      .mockResolvedValueOnce({
        ok: false,
        error: { kind: 'successor-unsupported' },
      });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getRetrySuccessor: read,
    });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Find visible retry successor' }),
    );
    await screen.findByText('No currently visible direct successor');
    expect(
      screen.getByText(/does not prove that no retry occurred/),
    ).toBeTruthy();
    const close = screen.getByRole('button', {
      name: 'Close successor lookup',
    });
    fireEvent.click(close);
    expect(document.activeElement).toBe(close);
    fireEvent.click(
      screen.getByRole('button', { name: 'Find visible retry successor' }),
    );
    await screen.findByText(/Successor lookup is unsupported by this server/);
    expect(
      screen.queryByText('No currently visible direct successor'),
    ).toBeNull();
    expect(screen.getByText('PRIVATE_FAILED_POLICY')).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('retires a held relationship with parent revalidation and ignores its late denial', async () => {
    const old = deferred<RunRetrySuccessorResult>();
    const parent = deferred<AssignedRunConsoleResult>();
    const read = vi
      .fn<RunRetrySuccessorClient['getRetrySuccessor']>()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce({ ok: true, value });
    const base = successfulRetryClient();
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockImplementationOnce(() => parent.promise);
    renderRetryWorkspace({ ...base, getConsole, getRetrySuccessor: read });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Find visible retry successor' }),
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(
      screen.queryByRole('region', { name: 'Retry successor lookup' }),
    ).toBeNull();
    await waitFor(() => expect(read.mock.calls[0]?.[1].aborted).toBe(true));
    await act(async () => {
      old.resolve({ ok: false, error: { kind: 'not-found' } });
      parent.resolve({ ok: true, console: failedConsole });
    });
    await screen.findByRole('button', { name: 'Find visible retry successor' });
    expect(screen.queryByText('Successor lookup unavailable')).toBeNull();
    await findSuccessor();
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('does not inherit target or return access from a visible relationship', async () => {
    const base = successfulRetryClient();
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockResolvedValue({ ok: false, error: { kind: 'not-found' } });
    renderRetryWorkspace({
      ...base,
      getConsole,
      getRetrySuccessor: async () => ({ ok: true, value }),
    });
    await select();
    await findSuccessor();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect successor attempt' }),
    );
    await screen.findByRole('heading', { name: 'Run context is unavailable' });
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to originating attempt' }),
    );
    await waitFor(() => expect(getConsole).toHaveBeenCalledTimes(3));
    await screen.findByRole('heading', { name: 'Run context is unavailable' });
    expect(
      screen.queryByRole('button', { name: 'Return to originating attempt' }),
    ).toBeNull();
  });
});
