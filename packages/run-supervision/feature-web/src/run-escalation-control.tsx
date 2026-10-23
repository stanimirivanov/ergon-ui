import {
  useRunEscalationReview,
  type AssignedRunConsole,
  type RunEscalationCommand,
  type RunEscalationFailure,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import { RunActionCard } from './run-action-card';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { RunEscalationForm } from './run-escalation-form';

/** Only current gated Console facts can open review; every opening reacquires authority. Failed/stale review retires private context before paint. */
export function RunEscalationControl({
  tenantId,
  run,
  onConfirm,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunEscalationCommand) => void;
  readonly onAccessFailure: (failure: RunEscalationFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const review = useRunEscalationReview(
    open &&
      run.state === 'ACTION_FAILED' &&
      run.stateVersion === 1 &&
      run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          expectedRunVersion: 1,
        }
      : null,
  );
  const stale =
    review.phase === 'ready' &&
    (review.data.supervisionRevision !== run.supervisionRevision ||
      review.data.runVersion !== run.stateVersion ||
      review.data.attemptNumber !== run.attemptNumber);
  const failure = review.phase === 'failed' ? review.error : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
    else if (stale) onAccessFailure({ kind: 'escalation-conflict' });
  }, [failure, stale, onAccessFailure]);
  if (run.state !== 'ACTION_FAILED' || run.stateVersion !== 1) return <></>;
  return (
    <RunActionCard
      label="Exhausted-run escalation"
      title="End exhausted recovery with human follow-up"
      consequence="Human follow-up · no further attempt"
    >
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Review runtime exhaustion before opening unassigned work. This does not
        create another attempt, execute a capability or close the case.
      </p>
      <div className="mt-4">
        <Button
          ref={trigger}
          variant="quiet"
          disabled={run.supervisionRevision === undefined}
          onClick={() => setOpen(true)}
        >
          Review exhausted-run escalation
        </Button>
      </div>
      {run.supervisionRevision === undefined ? (
        <p className="mt-2 text-xs text-ink-muted">
          This snapshot has no supported supervision epoch. Escalation is
          unavailable.
        </p>
      ) : null}
      {open ? (
        <ModalDialog
          id={`run-escalation-${id}`}
          title="Review exhausted-run escalation"
          dismissLabel="Cancel escalation review"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          {review.phase === 'ready' && !stale ? (
            <RunEscalationForm
              tenantId={tenantId}
              runId={run.runId}
              review={review.data}
              onConfirm={onConfirm}
            />
          ) : (
            <p role="status">
              Checking current supervision, resolver authority and exhausted
              retry budget…
            </p>
          )}
        </ModalDialog>
      ) : null}
    </RunActionCard>
  );
}
