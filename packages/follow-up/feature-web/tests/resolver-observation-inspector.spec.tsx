import { fireEvent, render, screen } from '@testing-library/react';
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
});
