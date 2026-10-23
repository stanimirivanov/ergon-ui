import type { RunExecutionReview } from '@ergon/run-supervision-data-access-web';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunCapabilityExecutionForm } from '../src/run-capability-execution-form';
import { RunCapabilityExecutionFeedback } from '../src/run-capability-execution-feedback';
import { assignedRunConsole, RUN_ID, TENANT_ID } from './assigned-run-fixtures';

afterEach(cleanup);
const review: RunExecutionReview = {
  supported: true,
  observedAt: '2026-10-16T08:00:00Z',
  supervisionRevision: 7,
  runVersion: 0,
  requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  decisionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  commandId: null,
  canExecute: true,
  canResume: false,
};

describe('authorization and recovery presentation', () => {
  it('shows exact risk, case scope and irreversible admission before acknowledged execution', async () => {
    const confirm = vi.fn();
    render(
      <RunCapabilityExecutionForm
        tenantId={TENANT_ID}
        run={assignedRunConsole}
        review={review}
        onConfirm={confirm}
      />,
    );
    expect(screen.getByText('Effective risk: MEDIUM')).not.toBeNull();
    expect(screen.getByText(assignedRunConsole.caseId)).not.toBeNull();
    expect(
      screen.getByRole('complementary', {
        name: 'Irreversible admission · external effect',
      }).textContent,
    ).toContain('commits before connector I/O');
    const submit = screen.getByRole('button', {
      name: 'Authorize and execute pinned action',
    });
    fireEvent.click(submit);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Acknowledge the external effect',
    );
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'execute',
        runId: RUN_ID,
        requestId: review.requestId,
        decisionId: review.decisionId,
        expectedSupervisionRevision: 7,
      }),
    );
  });

  it('labels new recovery as a dispatch against the original reservation, not exact replay', async () => {
    const confirm = vi.fn();
    const commandId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    render(
      <RunCapabilityExecutionForm
        tenantId={TENANT_ID}
        run={assignedRunConsole}
        review={{ ...review, canExecute: false, canResume: true, commandId }}
        onConfirm={confirm}
      />,
    );
    expect(
      screen.getByRole('complementary', {
        name: 'New dispatch · original reservation',
      }).textContent,
    ).toContain('not a status recheck or a new authorization');
    expect(
      screen.queryByRole('button', { name: 'Retry exact execution intent' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm new recovery attempt' }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'resume', commandId }),
    );
  });

  it('keeps uncertain replay explicit and does not execute it during rendering', () => {
    const retry = vi.fn();
    render(
      <RunCapabilityExecutionFeedback
        state={{
          phase: 'failed',
          error: { kind: 'transport' },
          command: {
            kind: 'execute',
            tenantId: TENANT_ID,
            runId: RUN_ID,
            commandId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            expectedSupervisionRevision: 7,
            expectedRunVersion: 0,
            requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            decisionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          },
        }}
        signInHref="/bff/login"
        onRetry={retry}
        onRecheck={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Uncertain result · preserve exact intent',
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'may first admit and dispatch',
    );
    expect(retry).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Confirm new recovery attempt' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact execution intent' }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });
});
