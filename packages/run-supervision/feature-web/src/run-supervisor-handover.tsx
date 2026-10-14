import {
  useRunSupervisorCandidates,
  type AssignedRunConsole,
  type RunSupervisorHandoverCommand,
  type RunSupervisorHandoverFailure,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { RunSupervisorHandoverForm } from './run-supervisor-handover-form';

/** Mount only for the current disclosed run; access withdrawal retires the dialog and all recipient identities. */
export function RunSupervisorHandover({
  tenantId,
  run,
  onConfirm,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunSupervisorHandoverCommand) => void;
  readonly onAccessFailure: (error: RunSupervisorHandoverFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [cursors, setCursors] = useState<readonly string[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const afterActorId = cursors.at(-1);
  const supported =
    run.handoverSupported === true && run.supervisionRevision !== undefined;
  const candidates = useRunSupervisorCandidates(
    open && supported && run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
          ...(afterActorId === undefined ? {} : { afterActorId }),
        }
      : null,
  );
  const candidateError =
    candidates.phase === 'failed' ? candidates.error : undefined;
  useLayoutEffect(() => {
    // This endpoint rechecks supervision as well as recipients. Its failure
    // invalidates disclosure of the earlier run snapshot, not only the directory.
    if (candidateError !== undefined) onAccessFailure(candidateError);
  }, [candidateError, onAccessFailure]);

  function confirm(actorId: string): void {
    if (
      candidates.phase !== 'ready' ||
      !supported ||
      run.supervisionRevision === undefined
    )
      return;
    onConfirm({
      tenantId,
      runId: run.runId,
      supervisorActorId: actorId,
      expectedSupervisionRevision: run.supervisionRevision,
      commandId: globalThis.crypto.randomUUID(),
    });
  }

  function move(next: readonly string[]): void {
    heading.current?.focus();
    setCursors(next);
  }

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="quiet"
        size="compact"
        disabled={!supported}
        onClick={() => {
          setCursors([]);
          setOpen(true);
        }}
      >
        Hand over supervision
      </Button>
      {!supported ? (
        <span className="text-xs text-ink-muted">
          Handover unavailable for this snapshot
        </span>
      ) : null}
      {open ? (
        <ModalDialog
          id={`run-handover-${id}`}
          title="Hand over supervision"
          dismissLabel="Cancel handover"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <div className="flex min-w-0 flex-col gap-5">
            <h3
              ref={heading}
              tabIndex={-1}
              className="font-semibold focus-visible:outline-accent-strong"
            >
              Choose an eligible resolver
            </h3>
            <p className="text-sm text-ink-muted">
              You are transferring supervision revision{' '}
              {run.supervisionRevision}. The identity registry currently
              supplies resolver IDs, not display names. No provider identity is
              disclosed.
            </p>
            {candidates.phase === 'ready' ? (
              <>
                {candidates.data.entries.length === 0 ? (
                  <p role="status">No other eligible resolvers on this page.</p>
                ) : null}
                <RunSupervisorHandoverForm
                  key={`${run.supervisionRevision}:${afterActorId ?? 'first'}`}
                  page={candidates.data}
                  onConfirm={confirm}
                />
                <nav
                  aria-label="Handover recipient pages"
                  className="flex flex-wrap gap-3"
                >
                  <Button
                    variant="quiet"
                    disabled={cursors.length === 0}
                    onClick={() => move(cursors.slice(0, -1))}
                  >
                    Previous recipient page
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={candidates.data.nextActorId === null}
                    onClick={() => {
                      if (candidates.data.nextActorId !== null)
                        move([...cursors, candidates.data.nextActorId]);
                    }}
                  >
                    Next recipient page
                  </Button>
                </nav>
              </>
            ) : candidates.phase === 'failed' ? (
              <p role="alert">
                Recipient access could not be verified. Withdrawing private run
                context.
              </p>
            ) : (
              <p role="status">
                Checking current supervision and recipient eligibility…
              </p>
            )}
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
