import type {
  AssignedRunConsoleResult,
  RunInvocationHistoryClient,
  RunInvocationHistoryResult,
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
  entries: [
    {
      stepId: 'step-one',
      capability: 'capability-one',
      connector: 'identity-stub',
      preparedAt: '2026-10-19T07:58:00Z',
      recordedAt: '2026-10-19T07:59:00Z',
      completion: null,
    },
  ],
  truncated: false,
};
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
  );
  await screen.findByRole('button', { name: 'Inspect gateway attempts' });
}

describe('gateway-attempt inspector', () => {
  it('allows protected inspection with enforcement enabled but no control lease, without enabling business commands', async () => {
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
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
      getInvocationHistory: read,
      getRunControl,
      changeRunControl: change,
    });
    await select();
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect gateway attempts' }),
    );
    await screen.findByRole('heading', { name: 'step-one · capability-one' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
  });
  it('reads only on demand, uses fresh reopening and grants no command authority', async () => {
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
      .mockResolvedValue({ ok: true, value: history });
    const base = successfulRetryClient();
    const send = vi.spyOn(base, 'retryRun');
    renderRetryWorkspace({ ...base, getInvocationHistory: read });
    await select();
    expect(read).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', {
      name: 'Inspect gateway attempts',
    });
    fireEvent.click(trigger);
    await screen.findByRole('heading', {
      name: 'step-one · capability-one',
    });
    expect(screen.getByText(/Partial coverage:/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close gateway history' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await screen.findByRole('heading', {
      name: 'step-one · capability-one',
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it('withdraws retained rows while rechecking and on denial without turning denial into empty history', async () => {
    const denied = deferred<RunInvocationHistoryResult>();
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
      .mockResolvedValueOnce({ ok: true, value: history })
      .mockImplementationOnce(() => denied.promise)
      .mockResolvedValueOnce({ ok: true, value: history });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getInvocationHistory: read,
    });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect gateway attempts' }),
    );
    await screen.findByRole('heading', {
      name: 'step-one · capability-one',
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck gateway history' }),
    );
    expect(
      screen.queryByRole('heading', {
        name: 'step-one · capability-one',
      }),
    ).toBeNull();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      denied.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await screen.findByText('Gateway history unavailable');
    expect(
      screen.getByText(/Private assignment rows are withheld/),
    ).toBeTruthy();
    expect(screen.queryByText(/A confirmed Console command/)).toBeNull();
    expect(screen.queryByText(/No gateway preparations recorded/)).toBeNull();
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
        name: 'Inspect gateway attempts',
      }),
    );
    await screen.findByRole('heading', { name: 'step-one · capability-one' });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('retires an open modal and private rows with the parent Console before its held recheck settles', async () => {
    const pending = deferred<AssignedRunConsoleResult>();
    const read = vi
      .fn<RunInvocationHistoryClient['getInvocationHistory']>()
      .mockResolvedValue({ ok: true, value: history });
    const base = successfulRetryClient();
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockImplementationOnce(() => pending.promise);
    renderRetryWorkspace({ ...base, getConsole, getInvocationHistory: read });
    await select();
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect gateway attempts' }),
    );
    await screen.findByRole('heading', {
      name: 'step-one · capability-one',
    });
    // A protected parent refresh can originate outside the modal (e.g. cache
    // invalidation); native background inertness is separately browser-tested.
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: 'step-one · capability-one',
      }),
    ).toBeNull();
    await act(async () =>
      pending.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    expect(
      screen.queryByRole('button', { name: 'Inspect gateway attempts' }),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
