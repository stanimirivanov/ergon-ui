import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResolverObservationInspector } from '../src/resolver-observation-inspector';
import { installNativeDialogTestDouble } from './native-dialog-test-double';
import {
  FIRST_WORK_ITEM_ID,
  resolverFollowUpCaseSummary,
} from './follow-up-fixtures';

describe('resolver observation inspector', () => {
  let restoreDialog: (() => void) | undefined;

  beforeEach(() => {
    restoreDialog = installNativeDialogTestDouble();
  });

  afterEach(() => {
    cleanup();
    restoreDialog?.();
    restoreDialog = undefined;
    vi.clearAllTimers();
    vi.useRealTimers();
  });

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

  it('does not schedule return focus that can steal a later interaction', () => {
    vi.useFakeTimers();
    const observations = sourcePair();
    render(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare sources' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Close comparison',
      }),
    );
    const filter = screen.getByRole('button', { name: 'Recorded later (1)' });
    filter.focus();
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(filter);
  });

  it('retires a comparison when its source disappears, without resurrecting it on return', () => {
    const observations = sourcePair();
    const { rerender } = render(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare sources' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    rerender(
      <ResolverObservationInspector
        observations={observations.slice(0, 1)}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('compares only currently authorized sources and closes when the filter removes one', () => {
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
      content: '<img src=x onerror=alert(1)>',
    };
    const third = {
      ...later,
      observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      streamVersion: 6,
      summary: 'Third source report',
      content: 'Private third source',
    };
    const { rerender } = render(
      <ResolverObservationInspector
        observations={[first, later, third]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Compare sources' }));
    const comparison = screen.getByRole('dialog', {
      name: 'Source comparison',
    });
    expect(within(comparison).getByText('Original')).toBeTruthy();
    expect(within(comparison).getAllByText('Later source report')).toHaveLength(
      2,
    );
    expect(within(comparison).getByText(later.content)).toBeTruthy();
    expect(comparison.textContent).toContain('In run snapshot');
    expect(comparison.textContent).toContain('Recorded later');
    expect(comparison.querySelector('img')).toBeNull();
    fireEvent.change(
      within(comparison).getByRole('combobox', {
        name: 'Second observation',
      }),
      { target: { value: third.observationId } },
    );
    expect(within(comparison).getByText(third.content)).toBeTruthy();
    expect(within(comparison).queryByText(later.content)).toBeNull();

    fireEvent.click(
      within(comparison).getByRole('button', { name: 'Close comparison' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Compare sources' }));
    expect(
      screen.getByRole('dialog', { name: 'Source comparison' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'In run snapshot (1)' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(later.content)).toBeNull();
    expect(screen.queryByText(third.content)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Compare sources' }),
    ).toBeNull();

    rerender(
      <ResolverObservationInspector
        observations={[first]}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(later.content)).toBeNull();
    expect(screen.queryByText(third.content)).toBeNull();
  });

  it('retires selected detail identity and focuses only an explicit current inspection', () => {
    const observations = sourcePair();
    const { rerender } = render(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    const later = screen.getByRole('button', {
      name: 'Inspect observation: Later source report',
    });
    fireEvent.click(later);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Source observation details' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to observations' }),
    );
    expect(document.activeElement).toBe(later);
    rerender(
      <ResolverObservationInspector
        observations={observations.slice(0, 1)}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    rerender(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    expect(screen.queryByText('Private later content')).toBeNull();
    expect(
      screen
        .getByRole('button', {
          name: 'Inspect observation: Later source report',
        })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('withdraws comparison and pending focus on unmount without stealing the next view focus', () => {
    vi.useFakeTimers();
    const observations = sourcePair();
    const { rerender } = render(
      <ResolverObservationInspector
        observations={observations}
        pinnedVersion={4}
        regionId="authorized-case"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare sources' }));
    const dialog = screen.getByRole('dialog');
    rerender(<button>Current access status</button>);
    const status = screen.getByRole('button', {
      name: 'Current access status',
    });
    status.focus();
    vi.runOnlyPendingTimers();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(screen.queryByText('Private later content')).toBeNull();
    expect(document.activeElement).toBe(status);
  });
});

function sourcePair() {
  const original = resolverFollowUpCaseSummary(FIRST_WORK_ITEM_ID, 'Original');
  const first = original.observations[0];
  if (first === undefined) throw new Error('The fixture must contain a source');
  return [
    first,
    {
      ...first,
      observationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: 5,
      summary: 'Later source report',
      content: 'Private later content',
    },
  ];
}
