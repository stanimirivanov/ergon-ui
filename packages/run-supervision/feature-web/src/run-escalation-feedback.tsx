import type { RunEscalationFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { RunEscalationState } from './use-run-escalation';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunEscalationFailure['kind'], Recovery> = {
  'escalation-disabled': 'recheck',
  'escalation-conflict': 'recheck',
  'invalid-escalation': 'recheck',
  'escalation-unavailable': 'replay',
  'escalation-unsupported': 'recheck',
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

/** Receipt copy acknowledges original creation, never current lifecycle/access. Failed review has no command to replay; uncertain commands retain exact intent. */
export function RunEscalationFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<RunEscalationState, { readonly phase: 'idle' }>;
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
        <h3 className="font-bold">Exhausted-run escalation pending…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private context is hidden before I/O. Escalation may already have
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
        <h3 className="font-bold">
          Human follow-up creation recorded · not claimed
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Historical acknowledgement: {state.receipt.followUpQueueKey} ·
          creation status {state.receipt.creationStatus}. OPEN describes
          original creation, not current ownership or status. No execution,
          proof or case closure is implied. Fresh protected reads must establish
          current run access. Use Back to follow-ups to discover the queue
          independently; claiming is a separate decision.
        </p>
        <dl className="mt-3 space-y-2 text-xs [overflow-wrap:anywhere]">
          <div>
            <dt className="font-bold">Created work item</dt>
            <dd>{state.receipt.followUpWorkItemId}</dd>
          </div>
          <div>
            <dt className="font-bold">Escalation event</dt>
            <dd>{state.receipt.escalationEventId}</dd>
          </div>
          <div>
            <dt className="font-bold">Originally requested</dt>
            <dd>{state.receipt.requestedAt}</dd>
          </div>
        </dl>
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
          ? 'Escalation review unavailable'
          : 'Escalation acknowledgement unavailable'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {isReviewFailure
          ? 'Current access or reviewed coordinates could not be verified. The earlier private snapshot is withdrawn. No command was created by this review.'
          : action === 'replay'
            ? 'The original escalation may already have committed. Retry only its unchanged command, epoch, failed revision, attempt and exhaustion policy. If it never committed, this may first open the originally confirmed work. Never substitute a new command ID to resolve uncertainty.'
            : state.error.kind === 'escalation-conflict'
              ? 'The reviewed epoch, run state or exhaustion policy changed, or another escalation already exists. Recheck fresh facts; never adopt unrelated prior work.'
              : state.error.kind === 'escalation-disabled'
                ? 'Browser escalation is disabled. This does not undo previously committed work. Recheck current facts instead of bypassing rollout.'
                : 'Access or browser escalation support is unavailable. Do not bypass the protected browser boundary.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact escalation intent</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>
            Recheck run before escalation review
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
        Leaving or signing in again may discard local replay intent. Neither
        cancels committed work nor grants run or follow-up access.
      </p>
    </div>
  );
}
