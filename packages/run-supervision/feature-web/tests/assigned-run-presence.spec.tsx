import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssignedRunPresence } from '../src/assigned-run-presence';

afterEach(cleanup);

describe('compact supervisor presence', () => {
  it('collapses only static guidance, preserving visible identity, actions and navigation without side effects', () => {
    const recheck = vi.fn();
    const close = vi.fn();
    const handover = vi.fn();
    const jump = vi.fn();
    render(
      <AssignedRunPresence
        presence={<span>Verified resolver</span>}
        isReadingAssigned={false}
        hasSelectedRun
        isCommandPending={false}
        onRecheck={recheck}
        onClose={close}
        handoverControl={
          <button onClick={handover}>Hand over supervision</button>
        }
        controlPanel={
          <section aria-label="Browser control">
            Browser control available
          </section>
        }
        sectionNavigation={<button onClick={jump}>Jump to execution</button>}
      />,
    );
    const guidance = screen.getByText('Supervision and authority boundaries');
    expect(guidance.closest('details')?.open).toBe(false);
    expect(screen.getByText('Verified resolver').closest('details')).toBeNull();
    expect(
      screen
        .getByRole('region', { name: 'Browser control' })
        .closest('details'),
    ).toBeNull();
    for (const name of [
      'Recheck assigned runs',
      'Close run',
      'Hand over supervision',
      'Jump to execution',
    ]) {
      expect(
        screen.getByRole('button', { name }).closest('details'),
      ).toBeNull();
    }
    fireEvent.click(guidance);
    expect(recheck).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(handover).not.toHaveBeenCalled();
    expect(jump).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Jump to execution' }));
    expect(jump).toHaveBeenCalledTimes(1);
  });

  it('keeps pending-operation restrictions independent of explanation disclosure', () => {
    render(
      <AssignedRunPresence
        presence={<span>Verified resolver</span>}
        isReadingAssigned
        hasSelectedRun
        isCommandPending
        onRecheck={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Supervision and authority boundaries'));
    expect(
      screen
        .getByRole('button', { name: 'Recheck assigned runs' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Close run' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});
