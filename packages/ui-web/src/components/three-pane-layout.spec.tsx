import { render, screen } from '@testing-library/react';

import { ThreePaneLayout } from './three-pane-layout';

describe('ThreePaneLayout', () => {
  it('preserves explicit reading order without creating domain landmarks', () => {
    const { container } = render(
      <ThreePaneLayout
        leadingLabel="Discovery pane"
        primaryLabel="Execution pane"
        trailingLabel="Proof pane"
        leading={<section aria-label="Discovery">First</section>}
        primary={<section aria-label="Execution">Second</section>}
        trailing={<section aria-label="Proof">Third</section>}
      />,
    );
    expect(
      screen.getAllByRole('region').map((node) => node.textContent),
    ).toEqual(['First', 'Second', 'Third']);
    expect(
      Array.from(container.querySelectorAll('[data-pane-slot]'), (node) =>
        node.getAttribute('data-pane-slot'),
      ),
    ).toEqual(['leading', 'primary', 'trailing']);
    const groups = screen.getAllByRole('group');
    expect(groups.map((node) => node.getAttribute('aria-label'))).toEqual([
      'Discovery pane',
      'Execution pane',
      'Proof pane',
    ]);
    expect(groups.map((node) => node.tabIndex)).toEqual([0, 0, 0]);
    groups[2]?.focus();
    expect(document.activeElement).toBe(
      screen.getByRole('group', { name: 'Proof pane' }),
    );
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
  });
});
