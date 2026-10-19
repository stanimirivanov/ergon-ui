import type { RunApprovalFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { useRunApprovalDecision } from './use-run-approval-decision';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunApprovalFailure['kind'], Recovery> = {
  'approval-disabled': 'recheck',
  'approval-conflict': 'recheck',
  'approval-authority-missing': 'recheck',
  'invalid-approval': 'recheck',
  'csrf-rejected': 'replay',
  'authentication-required': 'sign-in',
  'authentication-unavailable': 'leave',
  'actor-not-registered': 'leave',
  'identity-rejected': 'leave',
  forbidden: 'leave',
  'not-found': 'recheck',
  'invalid-page': 'recheck',
  'invalid-response': 'replay',
  transport: 'replay',
  timeout: 'replay',
  'request-cancelled': 'replay',
  'unexpected-defect': 'replay',
  'control-required': 'recheck',
  'control-conflict': 'recheck',
  'control-disabled': 'recheck',
  'control-unavailable': 'replay',
  'service-unavailable': 'replay',
  'unexpected-http-status': 'replay',
};
type ApprovalState = ReturnType<typeof useRunApprovalDecision>['state'];

/** Cause-free historical feedback only. Uncertain responses preserve the complete original command, never create a second intent. */
export function RunApprovalFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<ApprovalState, { readonly phase: 'idle' }>;
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
        <h3 className="font-bold">Recording human decision…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private run context is hidden before submission. No command retries
          automatically; wait for a checked receipt.
        </p>
      </div>
    );
  if (state.phase === 'succeeded')
    return (
      <div
        role="status"
        className="rounded-md border border-highlight/60 bg-highlight/10 p-4"
      >
        <h3 className="font-bold">
          Human decision recorded · {state.receipt.outcome}
        </h3>
        <p className="mt-2 text-sm text-ink-muted">
          This historical receipt acknowledges a human prerequisite only. It did
          not create a grant, execute a capability or advance the run. Assigned
          work is checked again; reopen the run for current facts.
        </p>
      </div>
    );
  const action = recovery[state.error.kind];
  const message =
    action === 'replay'
      ? 'The decision may already be recorded. Retry only the exact original request, outcome, command ID and supervision revision.'
      : state.error.kind === 'approval-authority-missing'
        ? 'Your current evidence does not establish the exact requested authority and scope. Resolver authority does not substitute for requester authority.'
        : state.error.kind === 'approval-conflict'
          ? 'The supervision epoch, request validity, runtime state or recorded response changed. Recheck before creating another decision.'
          : state.error.kind === 'approval-disabled'
            ? 'Browser decisions are disabled. An earlier uncertain command might still have completed; recover current facts.'
            : action === 'sign-in'
              ? 'Your browser session must be verified again. Signing in may discard this local retry intent.'
              : 'The current request or your access could not be verified. Private run context remains hidden.';
  return (
    <div
      role="alert"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h3 className="font-bold">Approval result unavailable</h3>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact decision</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>Recheck run before deciding again</Button>
        ) : null}
        {action === 'sign-in' ? (
          <a className="text-accent-strong underline" href={signInHref}>
            Sign in again
          </a>
        ) : null}
        <Button variant="quiet" onClick={onLeave}>
          Return to assigned runs
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Leaving discards local replay intent; it does not undo a sent decision.
      </p>
    </div>
  );
}
