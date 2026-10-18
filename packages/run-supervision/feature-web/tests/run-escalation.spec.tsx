import type {
  RunEscalationClient,
  RunEscalationCommand,
  RunEscalationCommandResult,
  RunEscalationReview,
  RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
const review: RunEscalationReview = {
  supported: true,
  observedAt: '2026-10-18T08:00:00Z',
  supervisionRevision: 7,
  runVersion: 1,
  attemptNumber: 2,
  retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
  maximumAttempts: 2,
  canEscalate: true,
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
  followUpQueueKey: 'access-restoration',
};
function client() {
  const base = successfulRetryClient();
  let escalated = false;
  return {
    ...base,
    listAssigned: async (
      ...args: Parameters<RunSupervisionClient['listAssigned']>
    ) =>
      escalated
        ? { ok: true as const, page: { entries: [], nextCursor: null } }
        : base.listAssigned(...args),
    getConsole: async () => ({
      ok: true as const,
      console: {
        ...failedConsole,
        attemptNumber: 2,
        state: escalated ? ('ESCALATED' as const) : ('ACTION_FAILED' as const),
        stateVersion: escalated ? 2 : 1,
      },
    }),
    getEscalationReview: async () => ({ ok: true as const, review }),
    escalateRun: async (
      command: RunEscalationCommand,
    ): Promise<RunEscalationCommandResult> => {
      escalated = true;
      return receipt(command);
    },
  };
}
function receipt(command: RunEscalationCommand): RunEscalationCommandResult {
  return {
    ok: true,
    receipt: {
      commandId: command.commandId,
      runId: command.runId,
      supervisionRevision: command.expectedSupervisionRevision,
      expectedRunVersion: 1,
      sourceAttemptNumber: command.sourceAttemptNumber,
      retryPolicyRevision: command.retryPolicyRevision,
      maximumAttempts: command.maximumAttempts,
      reason: command.reason,
      escalationEventId: '55555555-5555-4555-8555-555555555555',
      followUpWorkItemId: '66666666-6666-4666-8666-666666666666',
      followUpQueueKey: 'access-restoration',
      creationStatus: 'OPEN',
      requestedAt: review.observedAt,
      recordedAt: review.observedAt,
    },
  };
}
async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  await screen.findByText('PRIVATE_FAILED_POLICY');
}
async function open(): Promise<void> {
  fireEvent.click(
    screen.getByRole('button', { name: 'Review exhausted-run escalation' }),
  );
  await screen.findByRole('button', {
    name: 'Open unassigned human follow-up',
  });
}
async function confirm(): Promise<void> {
  const dialog = within(screen.getByRole('dialog'));
  fireEvent.click(dialog.getByRole('checkbox'));
  fireEvent.click(
    dialog.getByRole('button', { name: 'Open unassigned human follow-up' }),
  );
}

describe('confirmed exhausted recovery', () => {
  it('reads on demand, requires acknowledgement, and cancels without intent', async () => {
    const base = client();
    const read = vi.spyOn(base, 'getEscalationReview');
    const send = vi.spyOn(base, 'escalateRun');
    renderRetryWorkspace(base);
    await select();
    expect(read).not.toHaveBeenCalled();
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open unassigned human follow-up' }),
    );
    await screen.findByText(
      'Acknowledge the terminal escalation boundary before confirming.',
    );
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel escalation review' }),
    );
    expect(
      screen.getByRole('button', { name: 'Review exhausted-run escalation' }),
    ).toBe(document.activeElement);
    await open();
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it.each(['DISABLED', 'RETRY_BUDGET_AVAILABLE'] as const)(
    'never submits a %s observation',
    async (reason) => {
      const base = client();
      const send = vi.spyOn(base, 'escalateRun');
      const attemptNumber = reason === 'RETRY_BUDGET_AVAILABLE' ? 1 : 2;
      renderRetryWorkspace({
        ...base,
        getConsole: async () => ({
          ok: true,
          console: { ...failedConsole, attemptNumber },
        }),
        getEscalationReview: async () => ({
          ok: true,
          review:
            reason === 'DISABLED'
              ? { ...review, supported: false, canEscalate: false, reason }
              : {
                  ...review,
                  attemptNumber,
                  supported: true,
                  canEscalate: false,
                  reason,
                },
        }),
      });
      await select();
      fireEvent.click(
        screen.getByRole('button', { name: 'Review exhausted-run escalation' }),
      );
      await waitFor(() =>
        expect(
          within(screen.getByRole('dialog')).getByRole('status'),
        ).toBeTruthy(),
      );
      expect(
        screen.queryByRole('button', {
          name: 'Open unassigned human follow-up',
        }),
      ).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('withdraws all private DOM before one StrictMode command and freshly recovers selected terminal detail outside discovery', async () => {
    const base = client();
    const pending = deferred<RunEscalationCommandResult>();
    const send = vi.fn<RunEscalationClient['escalateRun']>((command) => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
      ).toBeNull();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        document.activeElement,
      );
      void base.escalateRun(command);
      return pending.promise;
    });
    const read = vi.spyOn(base, 'getConsole');
    renderRetryWorkspace({ ...base, escalateRun: send });
    await select();
    await open();
    await confirm();
    await screen.findByText('Exhausted-run escalation pending…');
    expect(send).toHaveBeenCalledTimes(1);
    const intent = send.mock.calls[0]?.[0];
    if (!intent) throw new Error('Missing intent');
    await act(async () => pending.resolve(receipt(intent)));
    await screen.findByText('Human follow-up creation recorded · not claimed');
    await within(
      screen.getByRole('group', { name: 'Run execution' }),
    ).findByText('Escalated', { exact: true });
    expect(read).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
    ).toBeNull();
    expect(screen.getByText(/OPEN describes original creation/)).toBeTruthy();
  });
  it('preserves every original field on explicit uncertain replay and permits no automatic resend', async () => {
    const base = client();
    const send = vi
      .fn<RunEscalationClient['escalateRun']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(base.escalateRun);
    renderRetryWorkspace({ ...base, escalateRun: send });
    await select();
    await open();
    await confirm();
    await screen.findByText(/If it never committed, this may first open/);
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact escalation intent' }),
    );
    await screen.findByText('Human follow-up creation recorded · not claimed');
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });
  it('requires fresh review after a definite conflict rather than offering replay', async () => {
    const base = client();
    renderRetryWorkspace({
      ...base,
      escalateRun: async () => ({
        ok: false,
        error: { kind: 'escalation-conflict' },
      }),
    });
    await select();
    await open();
    await confirm();
    await screen.findByRole('heading', {
      name: 'Escalation acknowledgement unavailable',
    });
    expect(
      screen.queryByRole('button', { name: 'Retry exact escalation intent' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Recheck run before escalation review',
      }),
    );
    await screen.findByText('PRIVATE_FAILED_POLICY');
    await open();
  });
  it.each(['denied', 'stale'] as const)(
    'withdraws private context on %s review without creating intent',
    async (mode) => {
      const base = client();
      const send = vi.spyOn(base, 'escalateRun');
      renderRetryWorkspace({
        ...base,
        getEscalationReview: async () =>
          mode === 'denied'
            ? { ok: false, error: { kind: 'not-found' } }
            : { ok: true, review: { ...review, supervisionRevision: 8 } },
      });
      await select();
      fireEvent.click(
        screen.getByRole('button', { name: 'Review exhausted-run escalation' }),
      );
      await screen.findByRole('heading', {
        name: 'Escalation review unavailable',
      });
      expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('does not let historical acknowledgement disclose a run after authority withdrawal', async () => {
    const base = client();
    let acknowledged = false;
    renderRetryWorkspace({
      ...base,
      getConsole: async () =>
        acknowledged
          ? { ok: false, error: { kind: 'not-found' } }
          : base.getConsole(),
      escalateRun: async (intent: RunEscalationCommand) => {
        acknowledged = true;
        return base.escalateRun(intent);
      },
    });
    await select();
    await open();
    await confirm();
    await screen.findByText('Human follow-up creation recorded · not claimed');
    await screen.findByText('Run context is unavailable');
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
  });
  it('retires pending callbacks after leaving instead of restoring selection from a late receipt', async () => {
    const base = client();
    const pending = deferred<RunEscalationCommandResult>();
    const send = vi.fn<RunEscalationClient['escalateRun']>(
      () => pending.promise,
    );
    const view = renderRetryWorkspace({ ...base, escalateRun: send });
    await select();
    await open();
    await confirm();
    await screen.findByText('Exhausted-run escalation pending…');
    view.unmount();
    const intent = send.mock.calls[0]?.[0];
    if (!intent) throw new Error('Missing intent');
    await act(async () => pending.resolve(receipt(intent)));
    expect(
      screen.queryByText('Human follow-up creation recorded · not claimed'),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
  });
});
