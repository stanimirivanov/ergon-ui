import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResolverObservationInspector } from '../src/resolver-observation-inspector';
import {
  FIRST_WORK_ITEM_ID,
  resolverFollowUpCaseSummary,
} from './follow-up-fixtures';

describe('resolver observation inspector', () => {
  it('derives selected detail from the current authorized observations', () => {
    const original = resolverFollowUpCaseSummary(
      FIRST_WORK_ITEM_ID,
      'Original',
    );
    const first = original.observations[0];
    if (first === undefined) {
      throw new Error('The fixture must contain an observation');
    }
    const later = {
      ...first,
      observationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: 5,
      summary: 'Later source report',
      content: 'Private later content',
    };
    const { rerender } = render(
      <ResolverObservationInspector
        observations={[first, later]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Inspect observation: Later source report',
      }),
    );
    expect(screen.getByText('Private later content')).toBeTruthy();

    rerender(
      <ResolverObservationInspector
        observations={[first]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(screen.queryByText('Private later content')).toBeNull();
    expect(screen.getByText('Original')).toBeTruthy();

    rerender(
      <ResolverObservationInspector
        observations={[]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(
      screen.queryByRole('region', { name: 'Source observation details' }),
    ).toBeNull();
    expect(screen.queryByText('Original')).toBeNull();
  });

  it('filters by the pinned evidence boundary without retaining a hidden selection', () => {
    const original = resolverFollowUpCaseSummary(
      FIRST_WORK_ITEM_ID,
      'Original',
    );
    const first = original.observations[0];
    if (first === undefined) {
      throw new Error('The fixture must contain an observation');
    }
    const later = {
      ...first,
      observationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: 5,
      summary: 'Later source report',
      content: 'Private later content',
    };
    const { rerender } = render(
      <ResolverObservationInspector
        observations={[first, later]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );

    const filters = screen.getByRole('group', {
      name: 'Filter observations by run snapshot',
    });
    const list = screen.getByRole('list', { name: 'Case observations' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(
      within(filters).getByRole('button', { name: 'Recorded later (1)' }),
    );
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Original')).toBeNull();
    expect(screen.getByText('Private later content')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Showing 1 of 2');

    fireEvent.click(
      within(filters).getByRole('button', { name: 'In run snapshot (1)' }),
    );
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Private later content')).toBeNull();
    expect(screen.getByText('Original')).toBeTruthy();

    rerender(
      <ResolverObservationInspector
        observations={[first]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    fireEvent.click(
      within(filters).getByRole('button', { name: 'Recorded later (0)' }),
    );
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);
    expect(
      screen.queryByRole('region', { name: 'Source observation details' }),
    ).toBeNull();
    expect(
      screen.getByText(
        'No observations were recorded after this run’s evidence snapshot.',
      ),
    ).toBeTruthy();
  });
});
