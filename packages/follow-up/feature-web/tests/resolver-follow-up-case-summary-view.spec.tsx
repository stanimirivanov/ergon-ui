import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResolverFollowUpCaseSummaryView } from '../src/resolver-follow-up-case-summary-view';
import {
  FIRST_WORK_ITEM_ID,
  resolverFollowUpCaseSummary,
} from './follow-up-fixtures';

describe('resolver case section jumps', () => {
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
