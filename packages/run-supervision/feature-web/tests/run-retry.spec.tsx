import type {
  RunRetryClient,
  RunRetryCommandResult,
  RunRetryReviewResult,
} from '@ergon/run-supervision-data-access-web';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RUN_ID, SECOND_RUN_ID } from './assigned-run-fixtures';
import {
  deferred,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  retryResult,
  retryReview,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();

describe('confirmed fresh-run retry', () => {
  it('reads only on demand, validates acknowledgement and cancels without creating intent', async () => {
    const client = successfulRetryClient();
    const read = vi.spyOn(client, 'getRetryReview');
    const send = vi.spyOn(client, 'retryRun');
    renderRetryWorkspace(client);
    await select();
    expect(read).not.toHaveBeenCalled();
    await review();
    fireEvent.click(
      screen.getByRole('button', { name: 'Create fresh successor' }),
    );
    expect(
      await screen.findByText(
        'Acknowledge the fresh-run boundary before confirming.',
      ),
    ).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel retry review' }),
    );
    expect(screen.getByRole('button', { name: 'Review fresh-run retry' })).toBe(
      document.activeElement,
    );
    await review();
    expect(read).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    'DISABLED',
    'ATTEMPT_LIMIT_REACHED',
    'PLAN_NOT_READY',
    'PLAN_DENIED',
    'OPERATION_CHANGED',
  ] as const)(
    'does not offer executable confirmation for %s',
    async (reason) => {
      const base = successfulRetryClient();
      const send = vi.spyOn(base, 'retryRun');
      const observed: RunRetryReviewResult =
        reason === 'DISABLED'
          ? {
              ok: true,
              review: {
                ...retryReview,
                supported: false,
                canRetry: false,
                reason,
                plan: null,
              },
            }
          : {
              ok: true,
              review: {
                ...retryReview,
                attemptNumber: reason === 'ATTEMPT_LIMIT_REACHED' ? 2 : 1,
                canRetry: false,
                reason,
                plan: null,
              },
            };
      renderRetryWorkspace({
        ...base,
        getConsole: async (...args) => {
          const result = await base.getConsole(...args);
          return result.ok && reason === 'ATTEMPT_LIMIT_REACHED'
            ? { ok: true, console: { ...result.console, attemptNumber: 2 } }
            : result;
        },
        getRetryReview: async () => observed,
      });
      await select();
      fireEvent.click(
        screen.getByRole('button', { name: 'Review fresh-run retry' }),
      );
      await waitFor(() =>
        expect(
          within(screen.getByRole('dialog')).getByRole('status'),
        ).toBeTruthy(),
      );
      expect(
        screen.queryByRole('button', { name: 'Create fresh successor' }),
      ).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('commits private withdrawal before one StrictMode command, then freshly selects independently guarded successor facts', async () => {
    const base = successfulRetryClient();
    const pending = deferred<RunRetryCommandResult>();
    const send = vi.fn<RunRetryClient['retryRun']>((command) => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Inspect run ${RUN_ID}` }),
      ).toBeNull();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        document.activeElement,
      );
      void base.retryRun(command, new AbortController().signal);
      return pending.promise;
    });
    const read = vi.spyOn(base, 'getConsole');
    renderRetryWorkspace({ ...base, retryRun: send });
    await select();
    await review();
    await confirm();
    expect(
      await screen.findByRole('heading', { name: 'Fresh-run retry pending…' }),
    ).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0];
    if (command === undefined) throw new Error('Missing exact intent');
    expect(command).toMatchObject({
      expectedSupervisionRevision: 7,
      expectedRunVersion: 1,
      expectedAttemptNumber: 1,
      plan: retryReview.plan,
    });
    await act(async () => {
      pending.resolve(retryResult(command));
    });
    expect(await screen.findByText('Attempt 2', { exact: true })).toBeTruthy();
    expect(
      screen.getByText('Fresh successor recorded · not executed'),
    ).toBeTruthy();
    expect(
      read.mock.calls.some(([query]) => query.runId === SECOND_RUN_ID),
    ).toBe(true);
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    expect(screen.queryByText(/Human response: APPROVED/)).toBeNull();
    expect(screen.getByText(/No terminal result recorded/)).toBeTruthy();
  });
  it('replays only the exact original tuple and warns that uncertainty may precede first commit', async () => {
    const base = successfulRetryClient();
    const send = vi
      .fn<RunRetryClient['retryRun']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(base.retryRun);
    renderRetryWorkspace({ ...base, retryRun: send });
    await select();
    await review();
    await confirm();
    expect(
      await screen.findByText(/If it never committed, this may first create/),
    ).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact successor intent' }),
    );
    await screen.findByText('Fresh successor recorded · not executed');
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });
  it('requires fresh review after a definite conflict rather than advertising replay', async () => {
    const base = successfulRetryClient();
    const read = vi.spyOn(base, 'getRetryReview');
    renderRetryWorkspace({
      ...base,
      retryRun: async () => ({ ok: false, error: { kind: 'retry-conflict' } }),
    });
    await select();
    await review();
    await confirm();
    await screen.findByRole('heading', {
      name: 'Retry acknowledgement unavailable',
    });
    expect(
      screen.queryByRole('button', { name: 'Retry exact successor intent' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck run before retry review' }),
    );
    await screen.findByText('PRIVATE_FAILED_POLICY');
    await review();
    expect(read).toHaveBeenCalledTimes(2);
  });
  it.each(['denied', 'changed-plan', 'changed-epoch'] as const)(
    'withdraws earlier private context for %s review without creating a command',
    async (mode) => {
      const base = successfulRetryClient();
      const send = vi.spyOn(base, 'retryRun');
      renderRetryWorkspace({
        ...base,
        getRetryReview: async () =>
          mode === 'denied'
            ? { ok: false, error: { kind: 'not-found' } }
            : {
                ok: true,
                review:
                  mode === 'changed-epoch'
                    ? { ...retryReview, supervisionRevision: 8 }
                    : {
                        ...retryReview,
                        plan: {
                          ...retryReview.plan,
                          capability: 'foreign.operation',
                        },
                      },
              },
      });
      await select();
      fireEvent.click(
        screen.getByRole('button', { name: 'Review fresh-run retry' }),
      );
      await screen.findByRole('heading', { name: 'Retry review unavailable' });
      expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Retry exact successor intent' }),
      ).toBeNull();
      expect(send).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        document.activeElement,
      );
    },
  );
  it('does not use a historical success receipt as authority to disclose a handed-over successor', async () => {
    const base = successfulRetryClient();
    renderRetryWorkspace({
      ...base,
      getConsole: async (query, signal) =>
        query.runId === SECOND_RUN_ID
          ? { ok: false, error: { kind: 'not-found' } }
          : base.getConsole(query, signal),
    });
    await select();
    await review();
    await confirm();
    await screen.findByText('Fresh successor recorded · not executed');
    await screen.findByRole('heading', { name: 'Run context is unavailable' });
    expect(screen.queryByText('CURRENT_RETRY_POLICY')).toBeNull();
    expect(screen.queryByText('Attempt 2', { exact: true })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Review execution or recovery' }),
    ).toBeNull();
  });
  it('retires late command callbacks after navigation instead of reselecting successor context', async () => {
    const base = successfulRetryClient();
    const read = vi.spyOn(base, 'getConsole');
    const pending = deferred<RunRetryCommandResult>();
    const send = vi.fn<RunRetryClient['retryRun']>(() => pending.promise);
    const view = renderRetryWorkspace({ ...base, retryRun: send });
    await select();
    await review();
    await confirm();
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const command = send.mock.calls[0]?.[0];
    if (command === undefined) throw new Error('Missing exact intent');
    const before = read.mock.calls.length;
    view.unmount();
    await act(async () => {
      pending.resolve(retryResult(command));
    });
    expect(read).toHaveBeenCalledTimes(before);
  });
});

async function select(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
  );
  await screen.findByText('PRIVATE_FAILED_POLICY');
  await screen.findByText('Browser control enforcement disabled');
}
async function review(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Review fresh-run retry' }),
  );
  await screen.findByRole('heading', { name: 'Confirm a fresh successor' });
}
async function confirm(): Promise<void> {
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Create fresh successor' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
