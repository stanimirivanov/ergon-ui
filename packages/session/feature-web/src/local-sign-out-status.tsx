import type { ReactElement } from 'react';
import { Button } from '@ergon/ui-web';
import type { LocalLogoutFailure } from '@ergon/session-data-access-web';
import type { LocalSignOutState } from './local-session-boundary';

const failures: Readonly<Record<LocalLogoutFailure, string>> = {
  forbidden:
    'The server rejected the sign-out check. Your local session may still be active.',
  unavailable:
    'The sign-out service is unavailable. Your local session may still be active.',
  transport:
    'The sign-out response was not received. The server may already have ended your session.',
  timeout: 'The sign-out check timed out. Its server outcome is uncertain.',
  'invalid-response':
    'The sign-out response could not be validated. Its server outcome is uncertain.',
  'request-cancelled':
    'The sign-out check was interrupted. Its server outcome is uncertain.',
  'unexpected-defect':
    'Sign-out could not be confirmed. No diagnostic details are shown.',
};
/** Public status only; host owns placement. Focus is committed before logout I/O, with no route/private-state restoration. */
export function LocalSignOutStatus({
  state,
  retry,
  signInHref,
}: {
  readonly state: LocalSignOutState;
  readonly retry: () => void;
  readonly signInHref: string | undefined;
}): ReactElement {
  const title =
    state.kind === 'pending'
      ? 'Signing out locally…'
      : state.kind === 'failed'
        ? 'Sign-out could not be confirmed.'
        : state.kind === 'signed-out'
          ? 'You are signed out locally.'
          : 'Sign-in is required.';
  return (
    <section
      className="grid min-w-0 gap-5"
      aria-labelledby="local-exit-heading"
    >
      <h1
        id="local-exit-heading"
        tabIndex={-1}
        ref={(element) => {
          element?.focus();
        }}
        className="text-3xl font-bold"
      >
        {title}
      </h1>
      <p>
        Your private view is closed. Drafts and in-memory recovery are no longer
        available.
      </p>
      {state.kind === 'pending' ? (
        <p role="status">
          Checking local session retirement. No private workspace is retained on
          this page.
        </p>
      ) : state.kind === 'failed' ? (
        <div role="alert" className="grid gap-4">
          <p>{failures[state.failure]}</p>
          <p>
            Keep this private view closed. Retry explicitly, or close this tab;
            reloading does not prove that sign-out succeeded.
          </p>
          <Button type="button" onClick={retry}>
            Retry local sign-out
          </Button>
        </div>
      ) : (
        <>
          <p>
            {state.kind === 'signed-out'
              ? 'The server acknowledged local session retirement.'
              : 'A fresh server check found no authenticated session; this is not a logout receipt.'}{' '}
            Your identity-provider session may remain active.
          </p>
          {signInHref === undefined ? (
            <p>
              Use your organization’s supplied tenant link to sign in again.
            </p>
          ) : (
            <a className="w-fit font-bold underline" href={signInHref}>
              Sign in again
            </a>
          )}
        </>
      )}
      <p className="text-sm text-ink-muted">
        Accepted work may still finish. Signing out does not undo a request or
        release control leases and ownership. Other tabs may still display
        previously loaded content; close them separately.
      </p>
    </section>
  );
}
