import {
  useRunPinnedContract,
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
import { RunContractDefinition } from './run-contract-definition';

/**
 * Mount only under the fresh Console gate, keyed by tenant/run/epoch. React owns
 * opening intent, RTK owns the contract observation. Parent withdrawal unmounts the modal before
 * commands/revalidation; opening, closing and rechecking never acquire a lease.
 * Failed access retires the earlier workspace disclosure before paint; unsupported
 * protocol is a compatibility state, never an empty contract or permission fallback.
 */
export function RunPinnedContractInspector({
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
  const read = useRunPinnedContract(
    open && run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          contractKey: run.contractKey,
          contractRevision: run.contractRevision,
          stepId: run.stepId,
          capability: run.capability,
        }
      : null,
  );
  const failure =
    read.phase === 'failed' && read.error.kind !== 'contract-unsupported'
      ? read.error
      : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
  }, [failure, onAccessFailure]);
  return (
    <RunInspectionEntry
      title="Pinned resolution contract"
      description="Exact immutable declarations, not effective policy, readiness, execution or proof."
      unavailableReason={
        run.supervisionRevision === undefined
          ? 'The contract cannot be inspected without a supported supervision epoch.'
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
          Inspect pinned contract
        </Button>
      }
    >
      {open ? (
        <ModalDialog
          id={`pinned-contract-${id}`}
          title="Pinned contract definition"
          dismissLabel="Close pinned contract"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <div className="min-w-0 space-y-4">
            <h3
              ref={heading}
              tabIndex={-1}
              className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Protected contract observation
            </h3>
            <Button
              variant="quiet"
              disabled={read.phase === 'pending'}
              onClick={() => {
                heading.current?.focus();
                read.recheck();
              }}
            >
              Recheck pinned contract
            </Button>
            {read.phase === 'ready' ? (
              <RunContractDefinition observation={read.data} run={run} />
            ) : read.phase === 'failed' ? (
              read.error.kind === 'contract-unsupported' ? (
                <p role="status">
                  Pinned contract inspection is unsupported by this server. No
                  definition has been returned. Deploy the compatible backend
                  before inspection.
                </p>
              ) : (
                <p role="status">Withdrawing earlier run context…</p>
              )
            ) : (
              <p role="status">
                Checking current supervision and resolver authority… Earlier
                contract content is hidden.
              </p>
            )}
          </div>
        </ModalDialog>
      ) : null}
    </RunInspectionEntry>
  );
}
