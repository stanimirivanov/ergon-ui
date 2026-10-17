import {
  useRunRetryReview,
  type AssignedRunConsole,
  type RunRetryCommand,
  type RunRetryFailure,
  type RunRetryReview,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { RunRetryForm } from './run-retry-form';

/** Mount only beneath the current Console gate. Every opening reacquires review; stale or failed access retires the earlier Console before paint. */
export function RunRetryControl({
  tenantId,
  run,
  onConfirm,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunRetryCommand) => void;
  readonly onAccessFailure: (failure: RunRetryFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const review = useRunRetryReview(
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
  const stale = review.phase === 'ready' && !matchesConsole(review.data, run);
  const failure = review.phase === 'failed' ? review.error : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
    else if (stale) onAccessFailure({ kind: 'retry-conflict' });
  }, [failure, stale, onAccessFailure]);
  if (run.state !== 'ACTION_FAILED' || run.stateVersion !== 1) return <></>;
  return (
    <section
      aria-label="Failed-run retry"
      className="rounded-md border border-highlight/60 bg-highlight/5 p-4"
    >
      <h3 className="font-bold">Start a fresh run after failure</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        A terminal failed action is not an uncertain invocation. Review the
        current retry budget and plan before creating a fresh successor. Nothing
        executes automatically.
      </p>
      <div className="mt-4">
        <Button
          ref={trigger}
          variant="quiet"
          disabled={run.supervisionRevision === undefined}
          onClick={() => setOpen(true)}
        >
          Review fresh-run retry
        </Button>
      </div>
      {run.supervisionRevision === undefined ? (
        <p className="mt-2 text-xs text-ink-muted">
          This snapshot has no supported supervision epoch. Retry is
          unavailable.
        </p>
      ) : null}
      {open ? (
        <ModalDialog
          id={`run-retry-${id}`}
          title="Review fresh-run retry"
          dismissLabel="Cancel retry review"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          {review.phase === 'ready' && !stale ? (
            <RunRetryForm
              tenantId={tenantId}
              runId={run.runId}
              review={review.data}
              onConfirm={onConfirm}
            />
          ) : (
            <p role="status">
              Checking current supervision, resolver authority and retry
              eligibility…
            </p>
          )}
        </ModalDialog>
      ) : null}
    </section>
  );
}

function matchesConsole(
  review: RunRetryReview,
  run: AssignedRunConsole,
): boolean {
  if (
    review.supervisionRevision !== run.supervisionRevision ||
    review.runVersion !== run.stateVersion ||
    review.attemptNumber !== run.attemptNumber
  )
    return false;
  const plan = review.plan;
  // Current evidence/policy may produce fresh safeguards. Only the operation
  // identity is pinned to the failed run; the form shows the new requirements.
  return (
    plan === null ||
    (plan.contractKey === run.contractKey &&
      plan.contractRevision === run.contractRevision &&
      plan.stepId === run.stepId &&
      plan.capability === run.capability &&
      plan.caseStreamVersion >= run.caseEvidenceStreamVersion)
  );
}
