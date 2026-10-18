import type { RunCancellationFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { RunCancellationState } from './use-run-cancellation';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunCancellationFailure['kind'], Recovery> = {
  'cancellation-disabled': 'recheck',
  'cancellation-conflict': 'recheck',
  'invalid-cancellation': 'recheck',
  'cancellation-unavailable': 'replay',
  'cancellation-unsupported': 'recheck',
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
  'service-unavailable': 'replay',
  'unexpected-http-status': 'replay',
};

/** Historical acknowledgement never restores private access. Review failures have no command; uncertain mutations preserve exactly one original intent. */
export function RunCancellationFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<RunCancellationState, { readonly phase: 'idle' }>;
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
        <h3 className="font-bold">Untouched-run cancellation pending…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private context is hidden before I/O. Cancellation may already have
          committed. No automatic retry or provider cancellation is implied.
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
          Run cancellation recorded · case not closed
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Historical acknowledgement only. The untouched run was cancelled at{' '}
          {state.receipt.cancelledAt}; recorded at {state.receipt.recordedAt}.
          Fresh protected reads must establish current access. No provider work
          was stopped, no proof accepted and no case closure is implied.
        </p>
      </div>
    );
  const isReviewFailure = state.phase === 'review-failed';
  const action = isReviewFailure
    ? state.error.kind === 'authentication-required'
      ? 'sign-in'
      : 'recheck'
    : recovery[state.error.kind];
  return (
    <div
      role="alert"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h3 className="font-bold">
        {isReviewFailure
          ? 'Cancellation review unavailable'
          : 'Cancellation acknowledgement unavailable'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {isReviewFailure
          ? 'Current access or reviewed coordinates could not be verified. The earlier private snapshot is withdrawn. No command was created by this review.'
          : action === 'replay'
            ? 'The original cancellation may already have committed. Retry only the unchanged command ID, supervision epoch and version-zero intent. If it never committed, this may first cancel the originally confirmed run under current server gates. Never substitute a new command ID to resolve uncertainty.'
            : state.error.kind === 'cancellation-conflict'
              ? 'The reviewed supervision, run state or authorization history changed. Recheck fresh facts before a new decision; do not replace the old intent silently.'
              : state.error.kind === 'cancellation-disabled'
                ? 'Browser cancellation is disabled. This does not undo a previously committed cancellation. Recheck current facts instead of bypassing rollout.'
                : 'Access or browser cancellation support is unavailable. Do not bypass the protected browser boundary.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact cancellation intent</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>
            Recheck run before cancellation review
          </Button>
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
        Leaving or signing in again may discard local replay intent. It cannot
        undo committed work or grant private access.
      </p>
    </div>
  );
}
