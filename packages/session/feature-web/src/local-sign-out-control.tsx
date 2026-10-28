import { useRef, useState, type ReactElement } from 'react';
import { Button, ModalDialog } from '@ergon/ui-web';
import { useLocalSignOut } from './local-session-boundary';

/** Cancel preserves the workspace; confirm delegates whole-tree retirement to the enclosing session boundary. */
export function LocalSignOutControl(): ReactElement | null {
  const signOut = useLocalSignOut();
  const [review, setReview] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (signOut === undefined) return null;
  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="quiet"
        onClick={() => setReview(true)}
      >
        Sign out
      </Button>
      {review && (
        <ModalDialog
          id="local-sign-out-review"
          title="Sign out of this application?"
          dismissLabel="Keep working"
          onDismiss={() => setReview(false)}
          returnFocusRef={trigger}
        >
          <div className="mt-5 grid gap-4">
            <p>
              This closes your private view and discards drafts and in-memory
              recovery. Accepted requests may still finish; signing out cannot
              undo them.
            </p>
            <p>
              This ends only this application’s local session. Your
              identity-provider session and other application sessions may
              remain active. Control leases and owned work are not released.
            </p>
            <Button type="button" onClick={signOut}>
              Sign out locally
            </Button>
          </div>
        </ModalDialog>
      )}
    </>
  );
}
