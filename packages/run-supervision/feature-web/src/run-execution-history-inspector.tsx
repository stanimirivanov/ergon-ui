import {
  useRunExecutionHistory,
  type AssignedRunConsole,
  type RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import { RunInspectionEntry } from './run-inspection-entry';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { RunExecutionAdmissionRecords } from './run-execution-admission-records';

/**
 * Mount only under the fresh Console gate, keyed by tenant/run/epoch. React owns
 * opening intent, RTK owns history. Parent withdrawal unmounts the modal before
 * commands/revalidation; opening, closing and rechecking never acquire a lease.
 * Failed access retires the earlier workspace disclosure before paint; unsupported
 * protocol is a compatibility state, never an empty history or permission fallback.
 */
export function RunExecutionHistoryInspector({
  tenantId,
  run,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onAccessFailure: (error: RunSupervisionFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const read = useRunExecutionHistory(
    open && run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
        }
      : null,
  );
  const failure =
    read.phase === 'failed' && read.error.kind !== 'history-unsupported'
      ? read.error
      : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
  }, [failure, onAccessFailure]);
  return (
    <RunInspectionEntry
      title="Execution admission history"
      description="Recorded browser admissions across supervision epochs, not dispatches or results."
      unavailableReason={
        run.supervisionRevision === undefined
          ? 'Admission history cannot be inspected without a supported supervision epoch.'
          : undefined
      }
      action={
        <Button
          ref={trigger}
          type="button"
          variant="quiet"
          size="compact"
          disabled={run.supervisionRevision === undefined}
          onClick={() => setOpen(true)}
        >
          Inspect recorded admissions
        </Button>
      }
    >
      {open ? (
        <ModalDialog
          id={`admission-history-${id}`}
          title="Recorded execution admissions"
          dismissLabel="Close admission history"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <div className="min-w-0 space-y-4">
            <h3
              ref={heading}
              tabIndex={-1}
              className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Protected history observation
            </h3>
            <Button
              variant="quiet"
              disabled={read.phase === 'pending'}
              onClick={() => {
                heading.current?.focus();
                read.recheck();
              }}
            >
              Recheck admission access
            </Button>
            {read.phase === 'ready' ? (
              <RunExecutionAdmissionRecords history={read.data} />
            ) : read.phase === 'failed' ? (
              read.error.kind === 'history-unsupported' ? (
                <p role="status">
                  Admission history is unsupported by this server. This is not
                  an empty history. Deploy the compatible backend before
                  inspection.
                </p>
              ) : (
                <p role="status">Withdrawing earlier run context…</p>
              )
            ) : (
              <p role="status">
                Checking current supervision and resolver authority… Earlier
                admission history is hidden.
              </p>
            )}
          </div>
        </ModalDialog>
      ) : null}
    </RunInspectionEntry>
  );
}
