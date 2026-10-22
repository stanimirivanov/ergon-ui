import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunInspectionEntry } from '../src/run-inspection-entry';

afterEach(cleanup);

describe('protected inspection launch framing', () => {
  it('preserves the caller-owned trigger and conditional modal without opening anything during rendering', () => {
    const open = vi.fn();
    const trigger = createRef<HTMLButtonElement>();
    const action = (
      <button ref={trigger} onClick={open}>
        Inspect pinned contract
      </button>
    );
    const props = {
      title: 'Pinned resolution contract',
      description: 'Exact declarations, not effective policy or proof.',
      unavailableReason: undefined,
      action,
    };
    const { rerender } = render(<RunInspectionEntry {...props} />);
    const region = screen.getByRole('region', { name: props.title });
    const button = within(region).getByRole('button', {
      name: 'Inspect pinned contract',
    });
    expect(trigger.current).toBe(button);
    expect(button.closest('details')).toBeNull();
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    expect(open).toHaveBeenCalledTimes(1);
    // The inspector decides when to supply its modal; framing does not clone
    // its trigger, replace the ref or introduce a second open/close owner.
    rerender(
      <RunInspectionEntry {...props}>
        <div role="dialog" aria-label="Inspector-owned modal">
          Protected observation
        </div>
      </RunInspectionEntry>,
    );
    expect(trigger.current).toBe(button);
    expect(
      screen.getByRole('dialog', { name: 'Inspector-owned modal' }),
    ).toBeTruthy();
    rerender(<RunInspectionEntry {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('keeps unavailable feedback visible and respects caller-owned disabled eligibility', () => {
    const open = vi.fn();
    render(
      <RunInspectionEntry
        title="Gateway-attempt history"
        description="Recorded preparations and measured gateway outcomes."
        unavailableReason="Gateway history cannot be inspected without a supported supervision epoch."
        action={
          <button disabled onClick={open}>
            Inspect gateway attempts
          </button>
        }
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Inspect gateway attempts',
    });
    expect(button.hasAttribute('disabled')).toBe(true);
    const reason = screen.getByText(
      'Gateway history cannot be inspected without a supported supervision epoch.',
    );
    expect(reason.closest('details')).toBeNull();
    fireEvent.click(button);
    expect(open).not.toHaveBeenCalled();
  });
});
