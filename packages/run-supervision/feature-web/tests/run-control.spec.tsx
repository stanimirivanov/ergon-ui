import type {
  RunControlClient,
  RunControlCommand,
  RunControlView,
} from '@ergon/run-supervision-data-access-web';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RUN_ID } from './assigned-run-fixtures';
import {
  deferred,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();
const fence = { leaseId: '77777777-7777-4777-8777-777777777777', revision: 1 };
const at = '2026-10-19T08:00:00Z';
function client() {
  let status: RunControlView = {
    status: 'AVAILABLE',
    supervisionRevision: 7,
    observedAt: at,
  };
  const base = successfulRetryClient();
  const changeRunControl = vi.fn<RunControlClient['changeRunControl']>(
    async (intent) => {
      status =
        intent.action === 'RELEASE'
          ? { status: 'AVAILABLE', supervisionRevision: 7, observedAt: at }
          : {
              status: 'THIS_SESSION',
              supervisionRevision: 7,
              observedAt: at,
              fence,
              expiresAt: '2026-10-19T08:02:00Z',
            };
      return {
        ok: true,
        value: {
          commandId: intent.commandId,
          runId: intent.runId,
          action: intent.action,
          supervisionRevision: 7,
          control: fence,
          changedAt: at,
          expiresAt: '2026-10-19T08:02:00Z',
          recordedAt: at,
        },
      };
    },
  );
  return {
    ...base,
    changeRunControl,
    getRunControl: vi.fn<RunControlClient['getRunControl']>(async () => ({
      ok: true,
      value: status,
    })),
    retryRun: vi.fn(base.retryRun),
  };
}
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
  );
  await within(screen.getByLabelText('Browser control')).findByRole('button', {
    name: 'Acquire browser control',
  });
}
describe('explicit browser control', () => {
  it('acquires, renews and releases explicitly; no selection or countdown submits a lifecycle command', async () => {
    const base = client();
    renderRetryWorkspace(base);
    await select();
    expect(base.changeRunControl).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Acquire browser control',
      }),
    );
    await screen.findByText('This browser session holds control');
    expect(base.changeRunControl.mock.calls[0]?.[0].action).toBe('ACQUIRE');
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Renew browser control',
      }),
    );
    await screen.findByText(
      'Control renew acknowledged historically. Current ownership requires the fresh status below.',
    );
    expect(base.changeRunControl.mock.calls[1]?.[0]).toMatchObject({
      action: 'RENEW',
      control: fence,
    });
    fireEvent.click(
      await within(screen.getByLabelText('Browser control')).findByRole(
        'button',
        { name: 'Release browser control' },
      ),
    );
    await within(screen.getByLabelText('Browser control')).findByRole(
      'button',
      { name: 'Acquire browser control' },
    );
    expect(base.changeRunControl.mock.calls[2]?.[0]).toMatchObject({
      action: 'RELEASE',
      control: fence,
    });
    expect(base.retryRun).not.toHaveBeenCalled();
  });
  it('captures the fence once with confirmed business intent and retains it on uncertain replay', async () => {
    const base = client();
    base.retryRun.mockResolvedValue({
      ok: false,
      error: { kind: 'transport' },
    });
    renderRetryWorkspace(base);
    await select();
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Acquire browser control',
      }),
    );
    // A lifecycle receipt is not authority; commands need the fresh status.
    await screen.findByText('This browser session holds control');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Review fresh-run retry' }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(await dialog.findByRole('checkbox'));
    fireEvent.click(
      dialog.getByRole('button', { name: 'Create fresh successor' }),
    );
    await screen.findByRole('button', { name: 'Retry exact successor intent' });
    expect(base.retryRun.mock.calls[0]?.[0].control).toEqual(fence);
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact successor intent' }),
    );
    await screen.findByRole('button', { name: 'Retry exact successor intent' });
    expect(base.retryRun.mock.calls[1]?.[0]).toEqual(
      base.retryRun.mock.calls[0]?.[0],
    );
    expect(base.changeRunControl).toHaveBeenCalledTimes(1);
  });
  it('retains exact uncertain lifecycle intent and observes ownership rather than trusting its receipt', async () => {
    const base = client();
    base.changeRunControl.mockResolvedValue({
      ok: false,
      error: { kind: 'transport' },
    });
    renderRetryWorkspace(base);
    await select();
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Acquire browser control',
      }),
    );
    fireEvent.click(
      await within(screen.getByLabelText('Browser control')).findByRole(
        'button',
        { name: 'Retry exact control intent' },
      ),
    );
    await within(screen.getByLabelText('Browser control')).findByRole(
      'button',
      { name: 'Retry exact control intent' },
    );
    const first: RunControlCommand | undefined =
      base.changeRunControl.mock.calls[0]?.[0];
    expect(base.changeRunControl.mock.calls[1]?.[0]).toEqual(first);
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
  });
  it('withdraws private context and command access during pending and failed control revalidation', async () => {
    const base = client();
    renderRetryWorkspace(base);
    await select();
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Acquire browser control',
      }),
    );
    await screen.findByRole('button', { name: 'Review fresh-run retry' });
    const held =
      deferred<Awaited<ReturnType<RunControlClient['getRunControl']>>>();
    base.getRunControl.mockImplementation(() => held.promise);
    fireEvent.click(
      within(screen.getByLabelText('Browser control')).getByRole('button', {
        name: 'Recheck browser control',
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    await act(async () =>
      held.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await screen.findByText(/Browser control unavailable/);
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close run' }));
    expect(
      screen.queryByRole('button', { name: 'Renew browser control' }),
    ).toBeNull();
  });
});
