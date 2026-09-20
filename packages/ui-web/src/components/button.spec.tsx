import { render, screen } from '@testing-library/react';

import { Button } from './button';

describe('Button', () => {
  it('renders a native button by default', () => {
    render(<Button>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' }).tagName).toBe(
      'BUTTON',
    );
  });

  it('can give button styling to a semantic link', () => {
    render(
      <Button asChild>
        <a href="#foundation">Review foundation</a>
      </Button>,
    );

    expect(
      screen
        .getByRole('link', { name: 'Review foundation' })
        .getAttribute('href'),
    ).toBe('#foundation');
  });
});
