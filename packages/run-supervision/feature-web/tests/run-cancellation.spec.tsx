import type {
  RunCancellationClient,
  RunCancellationCommand,
  RunCancellationCommandResult,
  RunCancellationReview,
} from '@ergon/run-supervision-data-access-web';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { assignedRunConsole, RUN_ID } from './assigned-run-fixtures';
import {
  deferred,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();
const review: RunCancellationReview = {
  supported: true,
  observedAt: '2026-10-18T08:00:00Z',
  supervisionRevision: 7,
  runVersion: 0,
  canCancel: true,
  reason: 'ELIGIBLE',
};
const untouched = {
  ...assignedRunConsole,
  supervisionRevision: 7,
  handoverSupported: false,
  policyRevision: 'PRIVATE_UNTOUCHED_POLICY',
};
function receipt(
  command: RunCancellationCommand,
): RunCancellationCommandResult {
  return {
    ok: true,
    receipt: {
      commandId: command.commandId,
      runId: command.runId,
      supervisionRevision: command.expectedSupervisionRevision,
      expectedRunVersion: 0,
      reason: 'OPERATOR_REQUESTED',
      cancelledAt: review.observedAt,
      recordedAt: review.observedAt,
    },
  };
}
function client() {
  const base = successfulRetryClient();
  let cancelled = false;
  return {
    ...base,
    listAssigned: async () =>
      cancelled
        ? { ok: true as const, page: { entries: [], nextCursor: null } }
        : base.listAssigned(
            { tenantId: 'unused' },
            new AbortController().signal,
          ),
    getConsole: async () => ({
      ok: true as const,
      console: {
        ...untouched,
        state: cancelled ? ('CANCELLED' as const) : untouched.state,
        stateVersion: cancelled ? 1 : 0,
      },
    }),
    getCancellationReview: async () => ({ ok: true as const, review }),
    cancelRun: async (
      intent: RunCancellationCommand,
    ): Promise<RunCancellationCommandResult> => {
      cancelled = true;
      return receipt(intent);
    },
  };
}
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  await screen.findByText('PRIVATE_UNTOUCHED_POLICY');
}
async function open(): Promise<void> {
  fireEvent.click(
    screen.getByRole('button', { name: 'Review untouched-run cancellation' }),
  );
  await screen.findByRole('button', {
    name: 'Cancel untouched run',
  });
}
function confirm(): void {
  const dialog = within(screen.getByRole('dialog'));
  fireEvent.click(dialog.getByRole('checkbox'));
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel untouched run' }));
}

describe('confirmed untouched-run cancellation', () => {
  it('requires fresh review and acknowledgement; dismissal restores focus without intent', async () => {
    const base = client();
    const read = vi.spyOn(base, 'getCancellationReview');
    const send = vi.spyOn(base, 'cancelRun');
    renderRetryWorkspace(base);
    await select();
    expect(read).not.toHaveBeenCalled();
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel untouched run' }),
    );
    await screen.findByText(
      'Acknowledge the untouched-run cancellation boundary before confirming.',
    );
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss cancellation review' }),
    );
    expect(
      screen.getByRole('button', { name: 'Review untouched-run cancellation' }),
    ).toBe(document.activeElement);
    await open();
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it('withdraws private DOM before one StrictMode send and freshly reads terminal detail outside discovery', async () => {
    const base = client();
    const pending = deferred<RunCancellationCommandResult>();
    const send = vi.fn<RunCancellationClient['cancelRun']>((intent) => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('PRIVATE_UNTOUCHED_POLICY')).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
      ).toBeNull();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        document.activeElement,
      );
      void base.cancelRun(intent);
      return pending.promise;
    });
    const read = vi.spyOn(base, 'getConsole');
    renderRetryWorkspace({ ...base, cancelRun: send });
    await select();
    await open();
    confirm();
    await screen.findByText('Untouched-run cancellation pending…');
    expect(send).toHaveBeenCalledTimes(1);
    const intent = send.mock.calls[0]?.[0];
    if (!intent) throw new Error('Missing intent');
    await act(async () => pending.resolve(receipt(intent)));
    await screen.findByText('Run cancellation recorded · case not closed');
    await within(
      screen.getByRole('group', { name: 'Run execution' }),
    ).findByText('Cancelled', { exact: true });
    expect(read).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeNull();
  });
  it('replays only unchanged uncertain intent without automatic resending', async () => {
    const base = client();
    const send = vi
      .fn<RunCancellationClient['cancelRun']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(base.cancelRun);
    renderRetryWorkspace({ ...base, cancelRun: send });
    await select();
    await open();
    confirm();
    await screen.findByText(/If it never committed, this may first cancel/);
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact cancellation intent' }),
    );
    await screen.findByText('Run cancellation recorded · case not closed');
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });
  it.each(['denied', 'stale'] as const)(
    'withdraws private context for %s review without intent',
    async (mode) => {
      const base = client();
      const send = vi.spyOn(base, 'cancelRun');
      renderRetryWorkspace({
        ...base,
        getCancellationReview: async () =>
          mode === 'denied'
            ? { ok: false, error: { kind: 'not-found' } }
            : { ok: true, review: { ...review, supervisionRevision: 8 } },
      });
      await select();
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Review untouched-run cancellation',
        }),
      );
      await screen.findByRole('heading', {
        name: 'Cancellation review unavailable',
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('PRIVATE_UNTOUCHED_POLICY')).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('does not reconstruct private resources from a successful historical acknowledgement after access loss', async () => {
    const base = client();
    let recorded = false;
    renderRetryWorkspace({
      ...base,
      getConsole: async () =>
        recorded
          ? { ok: false, error: { kind: 'not-found' } }
          : base.getConsole(),
      cancelRun: async (intent: RunCancellationCommand) => {
        recorded = true;
        return base.cancelRun(intent);
      },
    });
    await select();
    await open();
    confirm();
    await screen.findByText('Run cancellation recorded · case not closed');
    await screen.findByText('Run context is unavailable');
    expect(screen.queryByText('PRIVATE_UNTOUCHED_POLICY')).toBeNull();
  });
  it('retires late receipt callbacks on unmount', async () => {
    const base = client();
    const pending = deferred<RunCancellationCommandResult>();
    const send = vi.fn<RunCancellationClient['cancelRun']>(
      () => pending.promise,
    );
    const view = renderRetryWorkspace({ ...base, cancelRun: send });
    await select();
    await open();
    confirm();
    await screen.findByText('Untouched-run cancellation pending…');
    view.unmount();
    const intent = send.mock.calls[0]?.[0];
    if (!intent) throw new Error('Missing intent');
    await act(async () => pending.resolve(receipt(intent)));
    expect(
      screen.queryByText('Run cancellation recorded · case not closed'),
    ).toBeNull();
  });
});
