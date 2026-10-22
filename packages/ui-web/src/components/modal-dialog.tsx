import { FocusScope } from '@radix-ui/react-focus-scope';
import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import { Button } from './button';

interface ModalDialogProps {
  /** Stable, document-unique identity for the dialog and heading association. */
  readonly id: string;
  readonly title: string;
  readonly dismissLabel: string;
  readonly children: ReactNode;
  readonly onDismiss: () => void;
  /** A live focus target outside the dialog, normally the invoking control. */
  readonly returnFocusRef: RefObject<HTMLElement | null>;
}

/**
 * A mounted native modal for structured inspection content. Mount only while
 * disclosure is permitted; onDismiss must remove it. Requires showModal support.
 * Title and dismissLabel must be meaningful, nonempty accessible labels.
 * The browser owns the top layer and background inertness; Radix FocusScope
 * closes the keyboard loop without allowing Tab to visit browser chrome.
 * This primitive owns naming, initial title focus, Escape/close-button dismissal,
 * viewport placement and cleanup. Backdrop clicks do not dismiss the inspection.
 * Unmodified Home/End on its static title scroll this viewport instantly without
 * moving focus. Descendant controls keep their native key semantics.
 *
 * Explicit dismissal closes the native dialog before synchronously restoring
 * the live return target. Unmount closes it without invoking onDismiss or custom
 * return-focus work: the enclosing workflow owns focus after access withdrawal.
 * Deferred library cleanup must never restore a retired disclosure's focus. Complex
 * children keep their own semantics rather than becoming one aria-describedby.
 * Children must not close the native dialog independently (for example with
 * method="dialog"). Native lifecycle errors reach the enclosing React error
 * boundary; unsupported browsers never degrade to an unsafe nonmodal fallback.
 */
export function ModalDialog({
  id,
  title,
  dismissLabel,
  children,
  onDismiss,
  returnFocusRef,
}: ModalDialogProps): ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
    };
  }, []);

  function handleTitleKeyDown(event: KeyboardEvent<HTMLHeadingElement>): void {
    if (
      event.key === 'Tab' &&
      event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      // The title is outside sequential tab order. Enter the first control so
      // FocusScope wraps this same backward event to its last candidate.
      closeButton.current?.focus({ preventScroll: true });
      return;
    }
    if (
      event.defaultPrevented ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== 'Home' && event.key !== 'End')
    )
      return;
    const viewport = dialog.current;
    if (viewport === null) return;
    // Native Home can leave a long dialog at its bottom even while the offscreen
    // title stays focused. Own the intended viewport, not browser scroll routing.
    // Instant endpoints also avoid OS keyboard animation and respect reduced motion.
    event.preventDefault();
    viewport.scrollTo({
      top:
        event.key === 'Home'
          ? 0
          : Math.max(0, viewport.scrollHeight - viewport.clientHeight),
      behavior: 'instant',
    });
  }

  function dismiss(): void {
    const element = dialog.current;
    if (element === null || !element.open) return;
    // Native close restores its previous focus synchronously; our explicit
    // target then wins without a task that could steal a later workflow's focus.
    element.close();
    const target = returnFocusRef.current;
    if (target?.isConnected && !element.contains(target)) target.focus();
    onDismiss();
  }

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={`${id}-heading`}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      // Browser-queued close events include StrictMode cleanup. They must not
      // dismiss a replacement instance or trigger late return-focus work.
      className="ergon-inspection m-auto max-h-[calc(100dvh-2rem)] w-[min(70rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-lg border border-accent/55 bg-surface p-4 text-ink shadow-2xl sm:p-6"
    >
      <FocusScope
        loop
        onMountAutoFocus={(event) => event.preventDefault()}
        // FocusScope otherwise restores focus in a deferred cleanup task. The
        // modal owns explicit synchronous return; retired scopes must not focus.
        onUnmountAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2
            ref={heading}
            id={`${id}-heading`}
            tabIndex={-1}
            onKeyDown={handleTitleKeyDown}
            className="text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          >
            {title}
          </h2>
          <Button
            ref={closeButton}
            type="button"
            variant="quiet"
            className="rounded-md text-xs focus-visible:ring-accent-strong"
            onClick={dismiss}
          >
            {dismissLabel}
          </Button>
        </div>
        <div className="mt-4 min-w-0">{children}</div>
      </FocusScope>
    </dialog>
  );
}
