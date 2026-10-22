import {
  useRunPinnedReadiness,
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
import { RunReadinessObservation } from './run-readiness-observation';

/** Mount under fresh exact Console disclosure, keyed by epoch and immutable pin. React keeps opening intent only; RTK owns facts. Failed protected access withdraws the workspace before paint. Parent withdrawal retires the modal and subscription. */
export function RunPinnedReadinessInspector({
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
  const read = useRunPinnedReadiness(
    open && run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          caseId: run.caseId,
          caseStreamVersion: run.caseEvidenceStreamVersion,
          contractKey: run.contractKey,
          contractRevision: run.contractRevision,
        }
      : null,
  );
  const failure =
    read.phase === 'failed' && read.error.kind !== 'readiness-unsupported'
      ? read.error
      : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
  }, [failure, onAccessFailure]);
  return (
    <RunInspectionEntry
      title="Readiness at run pin"
      description="Fixed-input re-evaluation and selected citation, not historical planning or current-case readiness."
      unavailableReason={
        run.supervisionRevision === undefined
          ? 'Readiness cannot be inspected without a supported supervision epoch.'
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
          Inspect pinned readiness
        </Button>
      }
    >
      {open ? (
        <ModalDialog
          id={`pinned-readiness-${id}`}
          title="Pinned readiness inspection"
          dismissLabel="Close pinned readiness"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <div className="min-w-0 space-y-4">
            <h3
              ref={heading}
              tabIndex={-1}
              className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Protected readiness observation
            </h3>
            <Button
              variant="quiet"
              disabled={read.phase === 'pending'}
              onClick={() => {
                heading.current?.focus();
                read.recheck();
              }}
            >
              Recheck pinned readiness
            </Button>
            {read.phase === 'ready' ? (
              <RunReadinessObservation observation={read.data} />
            ) : read.phase === 'failed' ? (
              read.error.kind === 'readiness-unsupported' ? (
                <p role="status">
                  Pinned readiness inspection is unsupported by this server. No
                  assessment has been returned. Deploy the compatible backend
                  before inspection.
                </p>
              ) : (
                <p role="status">Withdrawing earlier run context…</p>
              )
            ) : (
              <p role="status">
                Checking current supervision and resolver authority… Earlier
                readiness and source content is hidden.
              </p>
            )}
          </div>
        </ModalDialog>
      ) : null}
    </RunInspectionEntry>
  );
}
