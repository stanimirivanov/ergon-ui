import type { RunProofFinalizationFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { useRunProofFinalization } from './use-run-proof-finalization';

type Recovery = 'recheck' | 'replay' | 'sign-in' | 'leave';
const recovery: Record<RunProofFinalizationFailure['kind'], Recovery> = {
  'proof-finalization-disabled': 'recheck',
  'proof-finalization-conflict': 'recheck',
  'invalid-proof-finalization': 'recheck',
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
type ProofState = ReturnType<typeof useRunProofFinalization>['state'];

/** Only historical acknowledgement survives the disclosure barrier; uncertainty never generates replacement intent. */
export function RunProofFinalizationFeedback({
  state,
  signInHref,
  onRetry,
  onRecheck,
  onLeave,
}: {
  readonly state: Exclude<ProofState, { readonly phase: 'idle' }>;
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
        <h3 className="font-bold">Recording outcome proof acceptance…</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Private run context is hidden before submission. No automatic retry
          occurs. A lost response does not mean the case stayed open.
        </p>
      </div>
    );
  if (state.phase === 'succeeded')
    return (
      <div
        role="status"
        className="rounded-md border border-highlight/60 bg-highlight/10 p-4"
      >
        <h3 className="font-bold">Proof acceptance recorded · case closed</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Historical receipt: run sequence {state.receipt.runSequence}, assessed
          case version {state.receipt.assessedCaseVersion}, closure version{' '}
          {state.receipt.caseClosureStreamVersion}. No connector was invoked.
          Fresh protected reads below establish current access and immutable
          accepted proof, not this acknowledgement.
        </p>
      </div>
    );
  const action = recovery[state.error.kind];
  return (
    <div
      role="alert"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h3 className="font-bold">Proof acceptance result unavailable</h3>
      <p className="mt-2 text-sm text-ink-muted">
        {action === 'replay'
          ? 'Acceptance may already be committed. Retry only the exact original command ID, supervision/run versions, assessed case version and evidence identities.'
          : state.error.kind === 'proof-finalization-conflict'
            ? 'The reviewed proof, supervision epoch or run state changed. Nothing different was accepted by this attempt. Recheck and review the current evidence before a new confirmation.'
            : state.error.kind === 'proof-finalization-disabled'
              ? 'Browser proof finalization is disabled. An earlier uncertain command might still have completed; recheck current facts.'
              : action === 'sign-in'
                ? 'Verify your browser session again. Signing in may discard local replay intent.'
                : 'The proof or your access could not be verified. Private run context remains hidden.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {action === 'replay' ? (
          <Button onClick={onRetry}>Retry exact proof acceptance</Button>
        ) : null}
        {action === 'recheck' ? (
          <Button onClick={onRecheck}>
            Recheck run before accepting proof
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
        Leaving discards local replay intent; it does not undo a sent
        acceptance.
      </p>
    </div>
  );
}
