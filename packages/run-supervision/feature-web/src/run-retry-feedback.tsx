import type { RunRetryFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { RunRetryState } from './use-run-retry';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunRetryFailure['kind'], Recovery> = {
  'retry-disabled': 'recheck',
  'retry-conflict': 'recheck',
  'invalid-retry': 'recheck',
  'retry-unavailable': 'replay',
  'retry-unsupported': 'recheck',
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

/** Historical feedback is not current supervision. An uncertain command can only replay its exact tuple; a failed read has no command to replay. */
export function RunRetryFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<RunRetryState, { readonly phase: 'idle' }>;
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
        <h3 className="font-bold">Fresh-run retry pending…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private context is hidden before I/O. The retry may already have
          committed. No automatic retry or cancellation is implied.
        </p>
      </div>
    );
  if (state.phase === 'succeeded')
    return (
      <div
        role="status"
        className="rounded-md border border-highlight/60 bg-highlight/10 p-4"
      >
        <h3 className="font-bold">Fresh successor recorded · not executed</h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Historical acknowledgement of attempt{' '}
          {state.receipt.sourceAttemptNumber + 1} of{' '}
          {state.receipt.maximumAttempts}. Fresh protected reads must establish
          current successor access. No execution authorization, outcome proof or
          case closure is implied.
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
          ? 'Retry review unavailable'
          : 'Retry acknowledgement unavailable'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {isReviewFailure
          ? 'Current access or reviewed coordinates could not be verified. The earlier private snapshot is withdrawn. No command was created by this review; do not bypass the browser boundary.'
          : action === 'replay'
            ? 'The original retry may already have committed. Retry only its unchanged command, versions and plan. If it never committed, this may first create the originally confirmed successor. Never substitute a new command ID to resolve uncertainty.'
            : state.error.kind === 'retry-conflict'
              ? 'The reviewed plan, epoch, run state or retry budget changed, or another retry already exists. Recheck fresh facts; do not silently adopt an unrelated successor.'
              : state.error.kind === 'retry-disabled'
                ? 'Browser retry is disabled. This does not undo any previously committed work. Recheck current run facts rather than bypassing rollout.'
                : 'Access or browser retry support is unavailable. Recheck through the protected browser boundary, not an internal endpoint.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact successor intent</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>Recheck run before retry review</Button>
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
        Leaving or signing in again may discard local replay intent. Neither
        cancels a committed retry nor restores successor access after handover.
      </p>
    </div>
  );
}
