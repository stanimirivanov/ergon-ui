import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunControlPanel } from '../src/run-control-panel';
import { RUN_ID, TENANT_ID } from './assigned-run-fixtures';

type PanelProps = Parameters<typeof RunControlPanel>[0];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('compact browser-control presentation', () => {
  it('keeps ownership, advisory countdown and explicit lifecycle actions outside collapsed guidance', () => {
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const props = panelProps();
    render(<RunControlPanel {...props} />);
    expect(screen.getByRole('status').textContent).toBe(
      'This browser session holds control',
    );
    const guidance = screen.getByText('Browser control boundaries');
    expect(guidance.closest('details')?.open).toBe(false);
    expect(screen.getByText('60s').closest('details')).toBeNull();
    expect(screen.getByText('60s').closest('[role="status"]')).toBeNull();
    for (const name of [
      'Renew browser control',
      'Release browser control',
      'Recheck browser control',
    ]) {
      expect(
        screen.getByRole('button', { name }).closest('details'),
      ).toBeNull();
    }
    fireEvent.click(guidance);
    act(() => {
      now = 2000;
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('59s')).toBeTruthy();
    expect(props.command.submit).not.toHaveBeenCalled();
    expect(props.control.read.recheck).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Renew browser control' }),
    );
    expect(props.command.submit).toHaveBeenCalledTimes(1);
  });

  it('does not hide uncertain acknowledgement, exact replay or explicit recovery with the guidance closed', () => {
    const props = panelProps();
    const failed: PanelProps = {
      ...props,
      control: {
        ...props.control,
        read: { phase: 'closed', recheck: vi.fn() },
        deadline: null,
      },
      command: {
        ...props.command,
        isBlockingDisclosure: true,
        state: {
          phase: 'failed',
          command: {
            tenantId: TENANT_ID,
            runId: RUN_ID,
            expectedSupervisionRevision: 7,
            commandId: 'lost-acquisition',
            action: 'ACQUIRE',
          },
          error: { kind: 'transport' },
        },
      },
    };
    render(<RunControlPanel {...failed} />);
    expect(screen.getByRole('alert').closest('details')).toBeNull();
    for (const name of [
      'Retry exact control intent',
      'Recheck run and control',
    ]) {
      expect(
        screen.getByRole('button', { name }).closest('details'),
      ).toBeNull();
    }
    expect(
      screen.getByText('Browser control boundaries').closest('details')?.open,
    ).toBe(false);
    expect(
      screen.queryByRole('button', { name: 'Renew browser control' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact control intent' }),
    );
    expect(failed.command.retry).toHaveBeenCalledTimes(1);
  });

  it.each(['pending', 'failed'] as const)(
    'keeps %s control status directly available without retaining ownership actions',
    (phase) => {
      const props = panelProps();
      const read: PanelProps['control']['read'] =
        phase === 'pending'
          ? { phase, hasRetainedData: true, recheck: vi.fn() }
          : { phase, error: { kind: 'transport' }, recheck: vi.fn() };
      render(
        <RunControlPanel
          {...props}
          control={{ ...props.control, read, deadline: null }}
        />,
      );
      expect(
        screen
          .getByRole(phase === 'pending' ? 'status' : 'alert')
          .closest('details'),
      ).toBeNull();
      expect(screen.queryByText('60s')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Renew browser control' }),
      ).toBeNull();
    },
  );
});

function panelProps(): PanelProps {
  return {
    control: {
      read: {
        phase: 'ready',
        data: {
          status: 'THIS_SESSION',
          supervisionRevision: 7,
          observedAt: '2026-10-19T08:00:00Z',
          expiresAt: '2026-10-19T08:02:00Z',
          fence: { leaseId: 'lease', revision: 1 },
        },
        recheck: vi.fn(),
      },
      deadline: 61000,
      canCommand: true,
      bind: (command) => command,
    },
    command: {
      state: { phase: 'idle' },
      isBlockingDisclosure: false,
      submit: vi.fn(),
      retry: vi.fn(),
      clear: vi.fn(),
    },
    query: {
      tenantId: TENANT_ID,
      runId: RUN_ID,
      expectedSupervisionRevision: 7,
    },
    heading: createRef<HTMLHeadingElement>(),
    onRecover: vi.fn(),
    signInHref: '/bff/login',
  };
}
