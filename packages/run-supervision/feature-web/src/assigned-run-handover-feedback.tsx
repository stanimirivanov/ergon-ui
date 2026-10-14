import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { RunHandoverState } from './use-run-supervisor-handover';
import { handoverFailurePresentation } from './run-handover-copy';

/** Historical command feedback remains separate from fresh discovery and private run truth. */
export function AssignedRunHandoverFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<RunHandoverState, { readonly phase: 'idle' }>;
  readonly signInHref: string;
  readonly onRetry: () => void;
  readonly onRecheck: () => void;
  readonly onLeave: () => void;
}): ReactElement {
  if (state.phase === 'submitting')
    return (
      <div
        role="status"
        className="rounded-md border border-border bg-surface p-4"
      >
        <h3 className="font-bold">Transferring supervision…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Run context and assignment rows are hidden before the command is sent.
          Wait for a checked receipt; no transfer is retried automatically.
        </p>
      </div>
    );
  if (state.phase === 'succeeded')
    return (
      <div
        role="status"
        className="rounded-md border border-highlight/60 bg-highlight/10 p-4"
      >
        <h3 className="font-bold">Supervision handover recorded</h3>
        <p className="mt-2 text-sm">
          The command recorded supervision revision{' '}
          {state.receipt.supervisionRevision}. This is a historical receipt, not
          a claim of current ownership after later transfers. Your assigned work
          is checked again.
        </p>
      </div>
    );
  const presentation = handoverFailurePresentation(state.error);
  if (state.phase === 'candidate-failed')
    return (
      <div
        role="alert"
        className="rounded-md border border-border bg-surface p-4"
      >
        <h3 className="font-bold">Recipient access unavailable</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Recipient discovery did not verify supervision. Private run context is
          hidden. No handover command was sent.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {presentation.recovery === 'sign-in' ? (
            <a className="text-accent-strong underline" href={signInHref}>
              Sign in again
            </a>
          ) : null}
          {presentation.recovery === 'recheck' ||
          presentation.recovery === 'replay' ? (
            <Button onClick={onRecheck}>
              Recheck run before choosing again
            </Button>
          ) : null}
          <Button variant="quiet" onClick={onLeave}>
            Return to assigned runs
          </Button>
        </div>
      </div>
    );
  return (
    <div
      role="alert"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h3 className="font-bold">Handover result unavailable</h3>
      <p className="mt-2 text-sm text-ink-muted">{presentation.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {presentation.recovery === 'replay' ? (
          <Button onClick={onRetry}>Retry exact handover</Button>
        ) : null}
        {presentation.recovery === 'recheck' ? (
          <Button onClick={onRecheck}>Recheck run before choosing again</Button>
        ) : null}
        {presentation.recovery === 'sign-in' ? (
          <a className="text-accent-strong underline" href={signInHref}>
            Sign in again
          </a>
        ) : null}
        <Button variant="quiet" onClick={onLeave}>
          Return to assigned runs
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Leaving discards local retry intent; it does not undo a sent transfer.
        Recover current assignments from the server.
      </p>
    </div>
  );
}
