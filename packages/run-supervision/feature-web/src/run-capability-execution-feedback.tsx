import type { RunExecutionFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { RunCapabilityExecutionState } from './use-run-capability-execution';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunExecutionFailure['kind'], Recovery> = {
  'execution-disabled': 'recheck',
  'execution-conflict': 'recheck',
  'execution-unsupported': 'recheck',
  'invalid-execution': 'recheck',
  'execution-unavailable': 'replay',
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

/** Only historical feedback survives disclosure barriers. Retry preserves original intent; it cannot manufacture another attempt but may first admit one not yet stored. */
export function RunCapabilityExecutionFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<
    RunCapabilityExecutionState,
    { readonly phase: 'idle' }
  >;
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
        <h3 className="font-bold">Execution acknowledgement pending…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private run context is hidden before I/O. The action may already be
          admitted. No automatic retry or cancellation is implied.
        </p>
      </div>
    );
  if (state.phase === 'succeeded') {
    const receipt = state.receipt;
    return (
      <div
        role="status"
        className="rounded-md border border-highlight/60 bg-highlight/10 p-4"
      >
        <p className="mb-2 text-xs font-bold tracking-wide text-highlight uppercase">
          Historical acknowledgement · not current authority
        </p>
        <h3 className="font-bold">
          {receipt.status === 'COMPLETED'
            ? 'Execution result recorded · not outcome proof'
            : receipt.status === 'RESULT_RECORDED'
              ? 'Receipt recorded · run projection incomplete'
              : 'Execution incomplete · external effect uncertain'}
        </h3>
        <p className="mt-2 text-sm text-ink-muted">
          {receipt.status === 'COMPLETED'
            ? `Historical sequence-one result: ${receipt.outcome} → ${receipt.resultingState}. This acknowledgement neither proves the outcome nor closes the case.`
            : 'A durable reservation exists. Incomplete does not mean no external effect. Review current execution eligibility below before explicitly confirming a new recovery attempt on the same reservation.'}{' '}
          Fresh protected reads below establish current access; this feedback
          does not.
        </p>
      </div>
    );
  }
  const reviewFailed = state.phase === 'review-failed';
  const action = reviewFailed
    ? state.error.kind === 'authentication-required'
      ? 'sign-in'
      : 'recheck'
    : recovery[state.error.kind];
  return (
    <div
      role="alert"
      className="rounded-md border border-highlight/60 bg-surface p-4"
    >
      <p className="mb-2 text-xs font-bold tracking-wide text-highlight uppercase">
        {action === 'replay'
          ? 'Uncertain result · preserve exact intent'
          : 'Fresh access required'}
      </p>
      <h3 className="font-bold">
        {reviewFailed
          ? 'Execution review unavailable'
          : 'Execution acknowledgement unavailable'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {reviewFailed
          ? state.error.kind === 'execution-unsupported'
            ? 'This server does not support browser execution review. The earlier private snapshot is withdrawn. No command was created; do not fall back to internal endpoints.'
            : 'Current execution access or reviewed coordinates could not be verified. The earlier private snapshot is withdrawn. No command was created by this review.'
          : action === 'replay'
            ? 'Retry only the unchanged original command/attempt and revisions. If the previous request was never admitted, this may first admit and dispatch that originally confirmed intent. If already admitted, it only reads status and never creates an additional recovery attempt. The effect may already be complete.'
            : state.error.kind === 'execution-conflict'
              ? 'The reviewed prerequisites, epoch or run state are stale or unavailable. Recheck and review fresh facts before confirming a new intent.'
              : state.error.kind === 'execution-disabled'
                ? 'Browser execution is disabled. Existing reservations remain durable.'
                : 'Access or execution support is unavailable. Do not bypass the browser boundary.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact execution intent</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>
            Recheck run before execution review
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
        Leaving discards local replay intent; it does not cancel an admitted
        effect. A different supervisor cannot adopt the original command.
      </p>
    </div>
  );
}
