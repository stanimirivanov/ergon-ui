import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModalDialog } from './modal-dialog';

describe('ModalDialog', () => {
  let restore: () => void;

  beforeEach(() => {
    const originalShow = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'showModal',
    );
    const originalClose = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'close',
    );
    const previousFocus = new WeakMap<HTMLDialogElement, Element | null>();
    // jsdom has no top layer or modal navigation. This double verifies only
    // lifecycle and restoration ordering; real keyboard containment is browser-tested.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) {
          previousFocus.set(this, document.activeElement);
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.removeAttribute('open');
          const previous = previousFocus.get(this);
          if (previous instanceof HTMLElement) previous.focus();
          this.dispatchEvent(new Event('close'));
        },
      },
    });
    restore = () => {
      for (const [name, descriptor] of [
        ['showModal', originalShow],
        ['close', originalClose],
      ] as const) {
        if (descriptor === undefined)
          Reflect.deleteProperty(HTMLDialogElement.prototype, name);
        else
          Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
      }
    };
  });

  afterEach(() => {
    cleanup();
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
    restore();
  });

  it('opens a named modal with title focus and preserves structured content', () => {
    render(
      <ModalDialog
        id="inspection"
        title="Inspection"
        dismissLabel="Close inspection"
        returnFocusRef={createRef()}
        onDismiss={vi.fn()}
      >
        <article>
          <h3>Source record</h3>
          <p>Plain source content</p>
        </article>
      </ModalDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Inspection' });
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
    expect(document.activeElement).toBe(
      within(dialog).getByRole('heading', { name: 'Inspection' }),
    );
    expect(within(dialog).getByRole('article')).toBeTruthy();
  });

  it.each(['pointer', 'cancel'] as const)(
    'closes before restoring the live target on %s dismissal',
    (kind) => {
      const target = createRef<HTMLButtonElement>();
      const onDismiss = vi.fn();
      render(
        <>
          <button ref={target}>Invoker</button>
          <ModalDialog
            id="inspection"
            title="Inspection"
            dismissLabel="Close inspection"
            returnFocusRef={target}
            onDismiss={onDismiss}
          >
            <p>Content</p>
          </ModalDialog>
        </>,
      );
      const dialog = screen.getByRole('dialog');
      onDismiss.mockImplementation(() => {
        expect(dialog.hasAttribute('open')).toBe(false);
        expect(document.activeElement).toBe(target.current);
      });
      if (kind === 'pointer')
        fireEvent.click(
          within(dialog).getByRole('button', { name: 'Close inspection' }),
        );
      else
        expect(
          fireEvent(dialog, new Event('cancel', { cancelable: true })),
        ).toBe(false);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    },
  );

  it('ignores close events from StrictMode cleanup and keeps the current dismissal callback', () => {
    const firstDismiss = vi.fn();
    const latestDismiss = vi.fn();
    const target = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <StrictMode>
        <ModalDialog
          id="inspection"
          title="Inspection"
          dismissLabel="Close inspection"
          returnFocusRef={target}
          onDismiss={firstDismiss}
        >
          <p>Old content</p>
        </ModalDialog>
      </StrictMode>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('close'));
    expect(firstDismiss).not.toHaveBeenCalled();
    expect(dialog.hasAttribute('open')).toBe(true);
    rerender(
      <StrictMode>
        <ModalDialog
          id="inspection"
          title="Inspection"
          dismissLabel="Close inspection"
          returnFocusRef={target}
          onDismiss={latestDismiss}
        >
          <p>Current content</p>
        </ModalDialog>
      </StrictMode>,
    );
    expect(screen.getByRole('dialog')).toBe(dialog);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Close inspection' }),
    );
    expect(firstDismiss).not.toHaveBeenCalled();
    expect(latestDismiss).toHaveBeenCalledTimes(1);
  });

  it('unmounts without invoking dismissal or its custom return-focus target', () => {
    const target = createRef<HTMLButtonElement>();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <>
        <button ref={target}>Surviving workflow</button>
        <ModalDialog
          id="inspection"
          title="Inspection"
          dismissLabel="Close inspection"
          returnFocusRef={target}
          onDismiss={onDismiss}
        >
          <p>Private content</p>
        </ModalDialog>
      </>,
    );
    const dialog = screen.getByRole('dialog');
    const focus = vi.spyOn(
      screen.getByRole('button', { name: 'Surviving workflow' }),
      'focus',
    );
    rerender(<button ref={target}>Surviving workflow</button>);
    fireEvent(dialog, new Event('close'));
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(screen.queryByText('Private content')).toBeNull();
  });

  it('does not focus a disconnected return target', () => {
    const detached = document.createElement('button');
    const target = { current: detached };
    const focus = vi.spyOn(detached, 'focus');
    const onDismiss = vi.fn();
    render(
      <ModalDialog
        id="inspection"
        title="Inspection"
        dismissLabel="Close inspection"
        returnFocusRef={target}
        onDismiss={onDismiss}
      >
        <p>Content</p>
      </ModalDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close inspection' }));
    expect(focus).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('loops from the static title and first/last controls without delayed return focus', () => {
    vi.useFakeTimers();
    const target = createRef<HTMLButtonElement>();
    const { unmount } = render(
      <>
        <button ref={target}>Invoker</button>
        <ModalDialog
          id="inspection"
          title="Inspection"
          dismissLabel="Close inspection"
          returnFocusRef={target}
          onDismiss={vi.fn()}
        >
          <label>
            Second source
            <select>
              <option>Source B</option>
            </select>
          </label>
        </ModalDialog>
      </>,
    );
    const dialog = screen.getByRole('dialog');
    const title = within(dialog).getByRole('heading', { name: 'Inspection' });
    const close = within(dialog).getByRole('button', {
      name: 'Close inspection',
    });
    const second = within(dialog).getByRole('combobox', {
      name: 'Second source',
    });
    fireEvent.keyDown(title, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second);
    unmount();
    const survivor = document.createElement('button');
    document.body.append(survivor);
    survivor.focus();
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(survivor);
    survivor.remove();
    vi.useRealTimers();
  });
});
