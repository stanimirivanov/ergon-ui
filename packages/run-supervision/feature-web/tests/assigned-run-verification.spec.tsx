import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AssignedRunVerification } from '../src/assigned-run-verification';
import { AssignedRunOutcomePane } from '../src/assigned-run-outcome-pane';
import { assignedRunConsole } from './assigned-run-fixtures';
import { matchingVerification, verifyingRun } from './run-verification-fixture';

afterEach(cleanup);
describe('single-condition verification presentation', () => {
  it('distinguishes unsupported, not assessed and missing evidence without inventing checks', () => {
    const view = render(<AssignedRunVerification run={assignedRunConsole} />);
    expect(screen.getByText(/Unsupported is not pending/)).toBeTruthy();
    view.rerender(
      <AssignedRunVerification
        run={{
          ...assignedRunConsole,
          outcomeVerification: {
            property: 'account.access.state',
            expectedValue: 'ACTIVE',
            status: 'NOT_ASSESSED',
            reason: 'RUN_NOT_VERIFYING',
            caseStreamVersion: null,
            evidence: null,
            acceptance: null,
          },
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Outcome not assessed' }),
    ).toBeTruthy();
    view.rerender(
      <AssignedRunVerification
        run={{
          ...verifyingRun,
          outcomeVerification: {
            ...matchingVerification,
            status: 'PENDING',
            reason: 'ELIGIBLE_EVIDENCE_MISSING',
            evidence: null,
          },
        }}
      />,
    );
    expect(screen.getByText(/No eligible post-action binding/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('does not turn a current match or mismatch into durable acceptance', () => {
    const view = render(<AssignedRunVerification run={verifyingRun} />);
    expect(
      screen.getByRole('heading', {
        name: 'Condition matches · not durably accepted',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Acceptance recorded')).toBeNull();
    view.rerender(
      <AssignedRunVerification
        run={{
          ...verifyingRun,
          outcomeVerification: {
            ...matchingVerification,
            status: 'PENDING',
            reason: 'VALUE_MISMATCH',
            evidence: { ...matchingVerification.evidence, value: 'LOCKED' },
          },
        }}
      />,
    );
    expect(
      screen.getByText(/latest eligible post-action binding differs/),
    ).toBeTruthy();
    expect(screen.queryByText('Verified case closure version')).toBeNull();
  });
  it('renders exact acceptance and closure from a terminal record and withdraws with private context', () => {
    const accepted = {
      ...verifyingRun,
      state: 'VERIFIED_RESOLVED',
      stateVersion: 2,
      stateUpdatedAt: '2026-10-09T10:02:00Z',
      outcomeVerification: {
        ...matchingVerification,
        status: 'ACCEPTED',
        acceptance: {
          runSequence: 2,
          acceptedAt: '2026-10-09T10:02:00Z',
          recordedAt: '2026-10-09T10:02:01Z',
          caseClosureStreamVersion: 6,
        },
      },
    } as const;
    const view = render(<AssignedRunOutcomePane run={accepted} />);
    expect(
      screen.getByRole('heading', { name: 'Durable outcome proof accepted' }),
    ).toBeTruthy();
    expect(screen.getByText('Verified case closure version')).toBeTruthy();
    view.rerender(<AssignedRunOutcomePane run={undefined} />);
    expect(
      screen.queryByRole('region', { name: 'Outcome verification' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Inspect verification evidence' }),
    ).toBeNull();
  });
});
