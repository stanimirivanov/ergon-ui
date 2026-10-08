import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResolverFollowUpCaseSummaryView } from '../src/resolver-follow-up-case-summary-view';
import {
  FIRST_WORK_ITEM_ID,
  resolverFollowUpCaseSummary,
} from './follow-up-fixtures';

describe('resolver case section jumps', () => {
  it('shows recorded risk and approval requirements without offering authorization', () => {
    render(
      <ResolverFollowUpCaseSummaryView
        summary={resolverFollowUpCaseSummary(FIRST_WORK_ITEM_ID, 'Source text')}
        regionId="authorized-case"
        isFetching={false}
      />,
    );

    const policy = screen.getByRole('region', {
      name: 'Recorded execution policy',
    });
    expect(within(policy).getByText('identity.lookup')).toBeTruthy();
    expect(within(policy).getByText('HIGH')).toBeTruthy();
    expect(within(policy).getByText('RESOLVER')).toBeTruthy();
    expect(within(policy).getByText('policy-7')).toBeTruthy();
    expect(
      within(policy).getByText(/not a current approval decision/i),
    ).toBeTruthy();
    expect(within(policy).queryByRole('button')).toBeNull();
    expect(
      within(
        screen.getByRole('region', { name: 'Automation handoff' }),
      ).queryByText('identity.lookup'),
    ).toBeNull();
  });

  it('moves focus between authorized panes without changing the URL', () => {
    render(
      <ResolverFollowUpCaseSummaryView
        summary={resolverFollowUpCaseSummary(FIRST_WORK_ITEM_ID, 'Source text')}
        regionId="authorized-case"
        isFetching={false}
      />,
    );

    const jumps = screen.getByRole('group', {
      name: 'Console section jumps',
    });
    const originalUrl = window.location.href;
    const destinations = [
      ['Jump to outcome', 'Not assessed'],
      ['Jump to attempts', 'Recorded attempts'],
      ['Jump to evidence', 'Recorded observations'],
    ] as const;

    for (const [action, heading] of destinations) {
      fireEvent.click(within(jumps).getByRole('button', { name: action }));
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { level: 3, name: heading }),
      );
      expect(window.location.href).toBe(originalUrl);
    }
  });
});
