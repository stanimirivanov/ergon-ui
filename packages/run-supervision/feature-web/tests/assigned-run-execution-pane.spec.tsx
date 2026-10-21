import type {
  AssignedRunConsole,
  AssignedRunRead,
} from '@ergon/run-supervision-data-access-web';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssignedRunExecutionPane } from '../src/assigned-run-execution-pane';
import { assignedRunConsole, RUN_ID } from './assigned-run-fixtures';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('execution-first Console presentation', () => {
  it('orders recorded facts before explicit commands, supporting inspection and attempt relationships', () => {
    const consoleError = vi.spyOn(console, 'error');
    const command = vi.fn();
    const inspect = vi.fn();
    const recheck = vi.fn();
    const props = paneProps({
      phase: 'ready',
      data: assignedRunConsole,
      recheck,
    });
    render(
      <AssignedRunExecutionPane
        {...props}
        approvalControl={
          <button key="same-snapshot" onClick={command}>
            Review approval
          </button>
        }
        executionControl={<button key="same-snapshot">Review execution</button>}
        retryControl={<button key="same-snapshot">Review retry</button>}
        escalationControl={
          <button key="same-snapshot">Review escalation</button>
        }
        cancellationControl={
          <button key="same-snapshot">Review cancellation</button>
        }
        pinnedContract={
          <button key="same-snapshot" onClick={inspect}>
            Inspect pinned contract
          </button>
        }
        pinnedReadiness={
          <button key="same-snapshot">Inspect pinned readiness</button>
        }
        executionHistory={
          <button key="same-snapshot">Inspect admissions</button>
        }
        invocationHistory={
          <button key="same-snapshot">Inspect gateway attempts</button>
        }
        retrySuccessor={<button>Inspect successor</button>}
      />,
    );

    const records = screen.getByRole('region', { name: 'Recorded execution' });
    const actions = screen.getByRole('region', { name: 'Run actions' });
    const inspection = screen.getByRole('region', {
      name: 'Supporting inspection',
    });
    const attempts = screen.getByRole('region', { name: 'Attempt context' });
    for (const [before, after] of [
      [records, actions],
      [actions, inspection],
      [inspection, attempts],
    ] as const) {
      expect(
        before.compareDocumentPosition(after) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    }
    expect(
      within(records).getByRole('heading', { name: 'Run start recorded' }),
    ).toBeTruthy();
    expect(
      within(records).getByRole('heading', {
        name: 'Execution detail unavailable',
      }),
    ).toBeTruthy();
    expect(within(records).queryAllByRole('button')).toHaveLength(0);
    expect(within(actions).getAllByRole('button')).toHaveLength(5);
    expect(within(inspection).getAllByRole('button')).toHaveLength(4);
    expect(
      within(attempts).getByRole('button', { name: 'Inspect successor' }),
    ).toBeTruthy();
    expect(command).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
    expect(recheck).not.toHaveBeenCalled();
    // Each slot keeps its own reconciliation boundary: sibling controls can
    // legitimately use the same tenant/run/epoch key for different resources.
    expect(consoleError).not.toHaveBeenCalled();
    fireEvent.click(
      within(actions).getByRole('button', { name: 'Review approval' }),
    );
    fireEvent.click(
      within(inspection).getByRole('button', {
        name: 'Inspect pinned contract',
      }),
    );
    expect(command).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(recheck).not.toHaveBeenCalled();
  });

  it.each(['pending', 'failed'] as const)(
    'withdraws every private section during %s while retaining the stable heading',
    (phase) => {
      const props = paneProps({
        phase: 'ready',
        data: assignedRunConsole,
        recheck: vi.fn(),
      });
      const { rerender } = render(<AssignedRunExecutionPane {...props} />);
      const heading = screen.getByRole('heading', {
        name: 'Resolution run',
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Recheck selected run' }),
      );
      expect(document.activeElement).toBe(heading);
      expect(props.detail.recheck).toHaveBeenCalledTimes(1);
      const detail: AssignedRunRead<AssignedRunConsole> =
        phase === 'pending'
          ? { phase, hasRetainedData: true, recheck: vi.fn() }
          : { phase, error: { kind: 'transport' }, recheck: vi.fn() };
      rerender(<AssignedRunExecutionPane {...props} detail={detail} />);
      for (const name of [
        'Recorded execution',
        'Run actions',
        'Supporting inspection',
        'Attempt context',
      ]) {
        expect(screen.queryByRole('region', { name })).toBeNull();
      }
      expect(
        screen.queryByText(assignedRunConsole.contractKey, { exact: true }),
      ).toBeNull();
      expect(screen.getByRole('heading', { name: 'Resolution run' })).toBe(
        heading,
      );
      expect(document.activeElement).toBe(heading);
    },
  );
});

function paneProps(
  detail: AssignedRunRead<AssignedRunConsole>,
): Parameters<typeof AssignedRunExecutionPane>[0] {
  return {
    detail,
    selectedRunId: RUN_ID,
    signInHref: '/bff/login',
    heading: createRef<HTMLHeadingElement>(),
    isBlockingDisclosure: false,
    onInspectPredecessor: vi.fn(),
  };
}
