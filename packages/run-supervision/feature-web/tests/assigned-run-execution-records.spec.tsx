import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssignedRunExecutionRecords } from '../src/assigned-run-execution-records';
import { assignedRunConsole, SECOND_RUN_ID } from './assigned-run-fixtures';

afterEach(cleanup);

describe('recorded-execution workspace', () => {
  it('keeps pinned context, result and sequence history distinct despite a wall-clock backstep', () => {
    const run = {
      ...assignedRunConsole,
      state: 'VERIFYING' as const,
      stateVersion: 1,
      stateUpdatedAt: '2026-10-09T09:54:00Z',
      execution: {
        stepId: assignedRunConsole.stepId,
        capability: assignedRunConsole.capability,
        connector: '<script>inert-connector</script>',
        outcome: 'SUCCEEDED' as const,
        completedAt: '2026-10-09T09:54:00Z',
        recordedAt: '2026-10-09T09:54:01Z',
        timing: {
          source: 'ergon.dev/measurement/connector-call/v1' as const,
          startedAt: '2026-10-09T09:56:00Z',
          elapsedNanoseconds: '9223372036854775807',
        },
      },
      transitions: [
        {
          sequence: 1,
          type: 'CAPABILITY_SUCCEEDED' as const,
          fromState: 'WAITING_FOR_APPROVAL' as const,
          toState: 'VERIFYING' as const,
          occurredAt: '2026-10-09T09:54:00Z',
          recordedAt: '2026-10-09T09:54:02Z',
        },
      ],
    };
    render(<AssignedRunExecutionRecords run={run} />);
    const context = screen.getByRole('list', {
      name: 'Available durable run records',
    });
    const result = screen.getByRole('region', {
      name: 'Connector result recorded',
    });
    const history = screen.getByRole('region', {
      name: 'Recorded run transitions',
    });
    expect(
      context.compareDocumentPosition(result) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      result.compareDocumentPosition(history) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      screen.getByText('Snapshot revision').nextElementSibling?.textContent,
    ).toBe('1');
    expect(within(context).getAllByRole('listitem')).toHaveLength(2);
    expect(within(result).getByText('9223372036854.775807 ms')).toBeTruthy();
    expect(within(result).getByText(run.execution.connector)).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
    expect(
      within(history).getByRole('heading', {
        name: '1 · Capability success projected',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    const policy = screen
      .getByText('Inspect recorded execution policy')
      .closest('details');
    const measurement = screen
      .getByText('Inspect execution measurement')
      .closest('details');
    expect(policy?.open).toBe(false);
    expect(measurement?.open).toBe(false);
    // Disclosure intent is local native DOM state, not a retained resource copy.
    fireEvent.click(screen.getByText('Inspect execution measurement'));
    expect(measurement?.open).toBe(true);
    expect(policy?.open).toBe(false);
  });

  it('derives fresh replacement coordinates and compatibility states without retaining an old result', () => {
    const view = render(
      <AssignedRunExecutionRecords run={assignedRunConsole} />,
    );
    expect(
      screen.getByRole('heading', { name: 'Execution detail unavailable' }),
    ).toBeTruthy();
    view.rerender(
      <AssignedRunExecutionRecords
        run={{
          ...assignedRunConsole,
          runId: SECOND_RUN_ID,
          attemptNumber: 2,
          execution: null,
          transitions: [],
        }}
      />,
    );
    expect(screen.getByText('Run ' + SECOND_RUN_ID)).toBeTruthy();
    expect(screen.queryByText('Run ' + assignedRunConsole.runId)).toBeNull();
    expect(screen.getByText('Attempt 2')).toBeTruthy();
    expect(screen.queryByText('Attempt 1')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'No terminal result recorded' }),
    ).toBeTruthy();
    expect(
      screen.getByText(/No state transition has been recorded/),
    ).toBeTruthy();
    expect(
      screen.queryByRole('list', { name: 'Sequence-ordered run transitions' }),
    ).toBeNull();
    expect(screen.queryByText('0 ms')).toBeNull();
  });
});
