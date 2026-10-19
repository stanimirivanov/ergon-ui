import type {
  AssignedRunConsoleResult,
  RunExecutionHistoryClient,
  RunExecutionHistoryResult,
  RunControlClient,
} from '@ergon/run-supervision-data-access-web';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RUN_ID } from './assigned-run-fixtures';
import {
  deferred,
  failedConsole,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();
const history = {
  observedAt: '2026-10-19T08:00:00Z',
  supervisionRevision: 7,
  commandRecorded: true,
  entries: [
    {
      kind: 'RECOVERY' as const,
      supervisionRevision: 0,
      admittedAt: '2026-10-19T07:58:00Z',
      recordedAt: '2026-10-19T07:59:00Z',
    },
  ],
  truncated: false,
};
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
  );
  await screen.findByRole('button', { name: 'Inspect recorded admissions' });
}

describe('execution admission inspector', () => {
  it('allows protected inspection with enforcement enabled but no control lease, without enabling business commands', async () => {
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockResolvedValue({ ok: true, value: history });
    const change = vi.fn<RunControlClient['changeRunControl']>();
    const getRunControl: RunControlClient['getRunControl'] = async () => ({
      ok: true,
      value: {
        status: 'AVAILABLE',
        supervisionRevision: 7,
        observedAt: history.observedAt,
      },
    });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getExecutionHistory: read,
      getRunControl,
      changeRunControl: change,
    });
    await select();
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect recorded admissions' }),
    );
    await screen.findByRole('heading', { name: 'Recovery admission' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
  });
  it('reads only on demand, uses fresh reopening and grants no command authority', async () => {
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockResolvedValue({ ok: true, value: history });
    const base = successfulRetryClient();
    const send = vi.spyOn(base, 'retryRun');
    renderRetryWorkspace({ ...base, getExecutionHistory: read });
    await select();
    expect(read).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', {
      name: 'Inspect recorded admissions',
    });
    fireEvent.click(trigger);
    await screen.findByRole('heading', {
      name: 'Recovery admission',
    });
    expect(screen.getByText(/Recovery may repair a projection/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close admission history' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await screen.findByRole('heading', {
      name: 'Recovery admission',
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it('withdraws retained rows while rechecking and on denial without turning denial into empty history', async () => {
    const denied = deferred<RunExecutionHistoryResult>();
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockResolvedValueOnce({ ok: true, value: history })
      .mockImplementationOnce(() => denied.promise)
      .mockResolvedValueOnce({ ok: true, value: history });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getExecutionHistory: read,
    });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect recorded admissions' }),
    );
    await screen.findByRole('heading', {
      name: 'Recovery admission',
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck admission access' }),
    );
    expect(
      screen.queryByRole('heading', {
        name: 'Recovery admission',
      }),
    ).toBeNull();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      denied.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await screen.findByText('Admission history unavailable');
    expect(
      screen.getByText(/Private assignment rows are withheld/),
    ).toBeTruthy();
    expect(screen.queryByText(/A confirmed Console command/)).toBeNull();
    expect(
      screen.queryByText(/No browser execution command recorded/),
    ).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Inspect run ' + RUN_ID }),
    ).toBeNull();
    expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
      document.activeElement,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Recheck run access' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Inspect recorded admissions',
      }),
    );
    await screen.findByRole('heading', { name: 'Recovery admission' });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('retires an open modal and private rows with the parent Console before its held recheck settles', async () => {
    const pending = deferred<AssignedRunConsoleResult>();
    const read = vi
      .fn<RunExecutionHistoryClient['getExecutionHistory']>()
      .mockResolvedValue({ ok: true, value: history });
    const base = successfulRetryClient();
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockImplementationOnce(() => pending.promise);
    renderRetryWorkspace({ ...base, getConsole, getExecutionHistory: read });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect recorded admissions' }),
    );
    await screen.findByRole('heading', {
      name: 'Recovery admission',
    });
    // A protected parent refresh can originate outside the modal (e.g. cache
    // invalidation); native background inertness is separately browser-tested.
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: 'Recovery admission',
      }),
    ).toBeNull();
    await act(async () =>
      pending.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    expect(
      screen.queryByRole('button', { name: 'Inspect recorded admissions' }),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
