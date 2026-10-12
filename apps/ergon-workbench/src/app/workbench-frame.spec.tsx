import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';

import { WorkbenchFrame } from './workbench-frame';

describe('WorkbenchFrame', () => {
  it('keeps the native skip target on the current tenant and capability query', () => {
    render(
      <MemoryRouter initialEntries={['/tenants/example?view=runs']}>
        <WorkbenchFrame mode="focused" statusLabel="Assigned · read only">
          Workspace
        </WorkbenchFrame>
      </MemoryRouter>,
    );
    expect(
      screen
        .getByRole('link', { name: 'Skip to main content' })
        .getAttribute('href'),
    ).toBe('/tenants/example?view=runs#main-content');
  });

  it('changes chrome without remounting mounted capability intent', () => {
    const content = <CapabilityIntent />;
    const { rerender } = render(
      <MemoryRouter>
        <WorkbenchFrame
          statusLabel="Resolver inbox"
          navigation={<nav aria-label="Workbench views">Views</nav>}
        >
          {content}
        </WorkbenchFrame>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Intent 0' }));
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toBeTruthy();

    rerender(
      <MemoryRouter>
        <WorkbenchFrame
          mode="focused"
          statusLabel="Escalated · claimed"
          toolbar={<section aria-label="Current claim">Claim controls</section>}
        >
          {content}
        </WorkbenchFrame>
      </MemoryRouter>,
    );
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Resolver Console',
    });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('button', { name: 'Intent 1' })).toBeTruthy();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Ergon home' })).toHaveLength(1);
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Workbench views' }),
    ).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Current claim' }).closest('main'),
    ).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Current claim' }).closest('header'),
    ).toBe(screen.getByRole('banner'));
    expect(screen.getByRole('main').tabIndex).toBe(-1);

    rerender(
      <MemoryRouter>
        <WorkbenchFrame statusLabel="Resolver inbox">{content}</WorkbenchFrame>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Intent 1' })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });
});

function CapabilityIntent() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Intent {count}
    </button>
  );
}
