import {
  useRunInvocationHistory,
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
import { RunInvocationRecords } from './run-invocation-records';

/**
 * Mount only under the fresh Console gate, keyed by tenant/run/epoch. React owns
 * opening intent, RTK owns history. Parent withdrawal unmounts the modal before
 * commands/revalidation; opening, closing and rechecking never acquire a lease.
 * Failed access retires the earlier workspace disclosure before paint; unsupported
 * protocol is a compatibility state, never an empty history or permission fallback.
 */
export function RunInvocationHistoryInspector({
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
  const read = useRunInvocationHistory(
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
      title="Gateway-attempt history"
      description="Recorded preparations and measured gateway outcomes, not dispatch guarantees or outcome proof."
      unavailableReason={
        run.supervisionRevision === undefined
          ? 'Gateway history cannot be inspected without a supported supervision epoch.'
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
          Inspect gateway attempts
        </Button>
      }
    >
      {open ? (
        <ModalDialog
          id={`invocation-history-${id}`}
          title="Recorded gateway attempts"
          dismissLabel="Close gateway history"
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
              Recheck gateway history
            </Button>
            {read.phase === 'ready' ? (
              <RunInvocationRecords history={read.data} />
            ) : read.phase === 'failed' ? (
              read.error.kind === 'history-unsupported' ? (
                <p role="status">
                  Gateway history is unsupported by this server. This is not an
                  empty history. Deploy the compatible backend before
                  inspection.
                </p>
              ) : (
                <p role="status">Withdrawing earlier run context…</p>
              )
            ) : (
              <p role="status">
                Checking current supervision and resolver authority… Earlier
                gateway history is hidden.
              </p>
            )}
          </div>
        </ModalDialog>
      ) : null}
    </RunInspectionEntry>
  );
}
