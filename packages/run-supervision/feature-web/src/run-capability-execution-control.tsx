import {
  useRunExecutionReview,
  type AssignedRunConsole,
  type RunExecutionCommand,
  type RunExecutionFailure,
  type RunExecutionReview,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { RunCapabilityExecutionForm } from './run-capability-execution-form';

/** Mount beneath the fresh Console gate. Every opening reacquires review; failed/stale access retires the entire earlier disclosure before paint. */
export function RunCapabilityExecutionControl({
  tenantId,
  run,
  onConfirm,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunExecutionCommand) => void;
  readonly onAccessFailure: (error: RunExecutionFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const review = useRunExecutionReview(
    open && run.supervisionRevision !== undefined && run.stateVersion === 0
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          expectedRunVersion: run.stateVersion,
        }
      : null,
  );
  const stale = review.phase === 'ready' && !matchesConsole(review.data, run);
  const error = review.phase === 'failed' ? review.error : undefined;
  useLayoutEffect(() => {
    if (error !== undefined) onAccessFailure(error);
    else if (stale) onAccessFailure({ kind: 'execution-conflict' });
  }, [error, stale, onAccessFailure]);
  if (run.stateVersion !== 0) return <></>;
  return (
    <section
      aria-label="Pinned action admission"
      className="rounded-md border border-highlight/60 bg-highlight/5 p-4"
    >
      <h3 className="font-bold">Execute the approved pinned action</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Supervision and an approval decision alone do not execute anything.
        Review current eligibility before deliberately admitting this one
        action. No automatic execution or retry.
      </p>
      <div className="mt-4">
        <Button
          ref={trigger}
          variant="quiet"
          disabled={run.supervisionRevision === undefined}
          onClick={() => setOpen(true)}
        >
          Review execution or recovery
        </Button>
      </div>
      {run.supervisionRevision === undefined ? (
        <p className="mt-2 text-xs text-ink-muted">
          This snapshot has no supported supervision epoch. Execution is
          unavailable.
        </p>
      ) : null}
      {open ? (
        <ModalDialog
          id={`run-execution-${id}`}
          title="Review pinned capability execution"
          dismissLabel="Cancel execution review"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          {review.phase === 'ready' && !stale ? (
            <RunCapabilityExecutionForm
              key={`${review.data.supervisionRevision}:${review.data.runVersion}:${review.data.requestId}:${review.data.decisionId}:${review.data.commandId}`}
              tenantId={tenantId}
              run={run}
              review={review.data}
              onConfirm={onConfirm}
            />
          ) : (
            <p role="status">
              Checking current supervision, resolver authority and execution
              eligibility…
            </p>
          )}
        </ModalDialog>
      ) : null}
    </section>
  );
}

function matchesConsole(
  review: RunExecutionReview,
  run: AssignedRunConsole,
): boolean {
  if (
    review.supervisionRevision !== run.supervisionRevision ||
    review.runVersion !== run.stateVersion
  )
    return false;
  if (!review.canExecute) return true;
  const approval = run.approvalReview;
  return (
    approval?.decision?.outcome === 'APPROVED' &&
    review.requestId?.toLowerCase() ===
      approval.request?.requestId.toLowerCase() &&
    review.decisionId?.toLowerCase() ===
      approval.decision.decisionId.toLowerCase()
  );
}
