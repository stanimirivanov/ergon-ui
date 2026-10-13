import type { AssignedRunTransition } from '@ergon/run-supervision-data-access-web';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AssignedRunTransitionHistory } from '../src/assigned-run-transition-history';

afterEach(cleanup);

describe('recorded run transition presentation', () => {
  it('distinguishes an unsupported projection from a supported empty revision', () => {
    const view = render(
      <AssignedRunTransitionHistory transitions={undefined} />,
    );
    expect(
      screen.getByText(/This server did not supply transition history/),
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    view.rerender(<AssignedRunTransitionHistory transitions={[]} />);
    expect(
      screen.getByText(/No state transition has been recorded/),
    ).toBeTruthy();
    expect(screen.queryByText(/This server did not supply/)).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('keeps append order despite backwards clocks and does not imply inspected proof', () => {
    const events: readonly AssignedRunTransition[] = [
      {
        sequence: 1,
        type: 'CAPABILITY_SUCCEEDED',
        fromState: 'WAITING_FOR_APPROVAL',
        toState: 'VERIFYING',
        occurredAt: '2026-10-13T10:00:00Z',
        recordedAt: '2026-10-13T10:00:01Z',
      },
      {
        sequence: 2,
        type: 'OUTCOME_PROOF_ACCEPTED',
        fromState: 'VERIFYING',
        toState: 'VERIFIED_RESOLVED',
        occurredAt: '2026-10-13T09:59:00Z',
        recordedAt: '2026-10-13T09:59:01Z',
      },
    ];
    render(<AssignedRunTransitionHistory transitions={events} />);
    const items = within(
      screen.getByRole('list', { name: 'Sequence-ordered run transitions' }),
    ).getAllByRole('listitem');
    expect(
      items.map((item) => within(item).getByRole('heading').textContent),
    ).toEqual([
      '1 · Capability success projected',
      '2 · Outcome proof acceptance recorded',
    ]);
    expect(
      screen.getByText(/not live tool spans or inspected proof evidence/),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Verified fact')).toBeNull();
    expect(items.at(-1)?.querySelector('time')?.dateTime).toBe(
      '2026-10-13T09:59:00Z',
    );
  });
});
