import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResolverRunAttemptHistory } from '../src/resolver-run-attempt-history';
import {
  FIRST_WORK_ITEM_ID,
  resolverFollowUpCaseSummary,
  RUN_ID,
} from './follow-up-fixtures';

describe('resolver run attempt history', () => {
  it('discloses only recorded events and links a superseded attempt to its successor', () => {
    const attempts = resolverFollowUpCaseSummary(
      FIRST_WORK_ITEM_ID,
      'Source text',
    ).runHistory.attempts;
    render(<ResolverRunAttemptHistory attempts={attempts} />);

    const history = screen.getByRole('list', { name: 'Resolution attempts' });
    expect(history.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(within(history).getByText(/Retry occurred at/)).toBeTruthy();
    const first = within(history)
      .getByText('Attempt 1 · SUPERSEDED')
      .closest('summary');
    const second = within(history)
      .getByText('Attempt 2 · ESCALATED')
      .closest('summary');
    if (first === null || second === null) {
      throw new Error('Each attempt must have a native summary');
    }
    const firstDisclosure = first.closest('details');
    const secondDisclosure = second.closest('details');
    if (firstDisclosure === null || secondDisclosure === null) {
      throw new Error('Each attempt must have a native disclosure');
    }
    expect(firstDisclosure.open).toBe(false);
    expect(secondDisclosure.open).toBe(false);

    fireEvent.click(first);
    expect(firstDisclosure.open).toBe(true);
    const firstEvents = screen.getByRole('list', {
      name: 'Recorded events for attempt 1',
    });
    expect(within(firstEvents).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(firstEvents).getByText(/Event 1 · connector failure/),
    ).toBeTruthy();
    expect(
      within(firstEvents).getByText(/Event 2 · retry started successor/),
    ).toBeTruthy();
    expect(within(firstEvents).getByText(RUN_ID)).toBeTruthy();
    expect(
      within(firstEvents).getByText(/READY_FOR_AUTHORIZATION → ACTION_FAILED/),
    ).toBeTruthy();
    expect(within(history).queryByText(/\d+ ms|cost \$/i)).toBeNull();

    fireEvent.click(second);
    expect(secondDisclosure.open).toBe(true);
    const secondEvents = screen.getByRole('list', {
      name: 'Recorded events for attempt 2',
    });
    expect(within(secondEvents).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(secondEvents).queryByText(/retry started successor/),
    ).toBeNull();
    expect(
      within(secondDisclosure).getByText(
        /not live tool calls or measured latency/,
      ),
    ).toBeTruthy();

    fireEvent.click(first);
    expect(firstDisclosure.open).toBe(false);
  });
});
