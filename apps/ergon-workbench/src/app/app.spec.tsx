import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { workbenchRoutes } from './router';

function renderRoute(path = '/') {
  const router = createMemoryRouter(workbenchRoutes, {
    initialEntries: [path],
  });

  return render(<RouterProvider router={router} />);
}

describe('App', () => {
  it('introduces the resolver workbench purpose', () => {
    renderRoute();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /evidence in\.\s*verified outcomes out\./i,
      }),
    ).toBeTruthy();
    expect(screen.getByText('Workbench shell ready')).toBeTruthy();
  });

  it('renders a recovery path for unknown routes', () => {
    renderRoute('/missing');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This workbench view does not exist.',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Return to the workbench' }),
    ).toBeTruthy();
  });
});
