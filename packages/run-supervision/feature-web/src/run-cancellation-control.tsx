import {
  useRunCancellationReview,
  type AssignedRunConsole,
  type RunCancellationCommand,
  type RunCancellationFailure,
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
import { RunCancellationForm } from './run-cancellation-form';

/** Only current gated Console facts can open review; every opening reacquires authority. Failed/stale review retires private context before paint. */
export function RunCancellationControl({
  tenantId,
  run,
  onConfirm,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunCancellationCommand) => void;
  readonly onAccessFailure: (failure: RunCancellationFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const review = useRunCancellationReview(
    open &&
      (run.state === 'WAITING_FOR_APPROVAL' ||
        run.state === 'READY_FOR_AUTHORIZATION') &&
      run.stateVersion === 0 &&
      run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          expectedRunVersion: 0,
        }
      : null,
  );
  const stale =
    review.phase === 'ready' &&
    (review.data.supervisionRevision !== run.supervisionRevision ||
      review.data.runVersion !== run.stateVersion);
  const failure = review.phase === 'failed' ? review.error : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
    else if (stale) onAccessFailure({ kind: 'cancellation-conflict' });
  }, [failure, stale, onAccessFailure]);
  if (
    !['WAITING_FOR_APPROVAL', 'READY_FOR_AUTHORIZATION'].includes(run.state) ||
    run.stateVersion !== 0
  )
    return <></>;
  return (
    <RunActionCard
      label="Untouched-run cancellation"
      title="Cancel before authorization or execution"
      consequence="Terminal decision · untouched runs only"
    >
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Cancel only before any durable authorization or execution. This does not
        stop provider work, compensate, refund a retry or close the case.
      </p>
      <div className="mt-4">
        <Button
          ref={trigger}
          variant="quiet"
          disabled={run.supervisionRevision === undefined}
          onClick={() => setOpen(true)}
        >
          Review untouched-run cancellation
        </Button>
      </div>
      {run.supervisionRevision === undefined ? (
        <p className="mt-2 text-xs text-ink-muted">
          This snapshot has no supported supervision epoch. Cancellation is
          unavailable.
        </p>
      ) : null}
      {open ? (
        <ModalDialog
          id={`run-cancellation-${id}`}
          title="Review untouched-run cancellation"
          dismissLabel="Dismiss cancellation review"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          {review.phase === 'ready' && !stale ? (
            <RunCancellationForm
              tenantId={tenantId}
              runId={run.runId}
              review={review.data}
              onConfirm={onConfirm}
            />
          ) : (
            <p role="status">
              Checking current supervision, resolver authority and absence of
              authorization or execution…
            </p>
          )}
        </ModalDialog>
      ) : null}
    </RunActionCard>
  );
}
