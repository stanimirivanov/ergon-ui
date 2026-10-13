import type { AssignedRunExecution } from '@ergon/run-supervision-data-access-web';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssignedRunCapabilityExecution } from '../src/assigned-run-capability-execution';
import { formatGatewayLatency } from '../src/execution-measurement-copy';

const execution: AssignedRunExecution = {
  stepId: 'restore-access',
  capability: 'workspace-access.update',
  connector: '<script>private-looking-but-inert</script>',
  outcome: 'SUCCEEDED',
  completedAt: '2026-10-01T09:10:00Z',
  recordedAt: '2026-10-01T09:10:01Z',
  timing: {
    source: 'ergon.dev/measurement/connector-call/v1',
    startedAt: '2026-10-01T09:11:00Z',
    elapsedNanoseconds: '305123456',
  },
};

afterEach(cleanup);

describe('capability execution presentation', () => {
  it.each([
    ['0', '0 ms'],
    ['1', '0.000001 ms'],
    ['1000000', '1 ms'],
    ['305123456', '305.123456 ms'],
    ['9007199254740993', '9007199254.740993 ms'],
    ['9223372036854775807', '9223372036854.775807 ms'],
  ])('formats %s nanoseconds exactly as %s', (nanoseconds, expected) => {
    expect(formatGatewayLatency(nanoseconds)).toBe(expected);
  });

  it.each([
    {
      execution: undefined,
      title: 'Execution detail unavailable',
      meaning: /Whether a terminal receipt exists is unknown/,
    },
    {
      execution: null,
      title: 'No terminal result recorded',
      meaning: /does not prove that no external effect occurred/,
    },
  ])(
    'does not conflate $title with zero latency',
    ({ execution, title, meaning }) => {
      render(<AssignedRunCapabilityExecution execution={execution} />);
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(screen.getByText(meaning)).toBeTruthy();
      expect(screen.queryByText('0 ms')).toBeNull();
    },
  );

  it('renders historical failure without invented latency, cost or proof', () => {
    render(
      <AssignedRunCapabilityExecution
        execution={{ ...execution, outcome: 'FAILED', timing: null }}
      />,
    );
    expect(screen.getByText('Connector failed')).toBeTruthy();
    expect(screen.getByText('Unmeasured', { exact: true })).toBeTruthy();
    expect(screen.getByText('Not measured', { exact: true })).toBeTruthy();
    expect(screen.queryByText('Inspect execution measurement')).toBeNull();
    expect(screen.queryByText('0 ms')).toBeNull();
  });

  it('renders measured zero, exact attribution and inert strings without acquiring authority or deriving proof', () => {
    render(
      <AssignedRunCapabilityExecution
        execution={{
          ...execution,
          timing: {
            ...execution.timing,
            source: 'ergon.dev/measurement/connector-call/v1',
            startedAt: '2026-10-01T09:11:00Z',
            elapsedNanoseconds: '0',
          },
        }}
      />,
    );
    expect(screen.getByText('Connector succeeded')).toBeTruthy();
    expect(screen.getByText('0 ms')).toBeTruthy();
    expect(screen.getByText('0', { exact: true })).toBeTruthy();
    expect(screen.getByText(execution.connector)).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
    expect(
      screen.getByText(/Connector success is not outcome proof/),
    ).toBeTruthy();
    expect(screen.getByText(/not provider-operation latency/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
