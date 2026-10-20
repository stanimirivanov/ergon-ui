import {
  useRunRetrySuccessor,
  type AssignedRunConsole,
  type RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

/**
 * Key by tenant/source/epoch under the ready Console gate. RTK owns the lookup;
 * React owns opening/focus intent only. Failures withdraw parent disclosure before
 * paint; unsupported endpoints stay compatibility feedback. Opening a link hands
 * off identity only to a fresh target gate, never facts or an authority token.
 */
export function RunRetrySuccessorLookup({
  tenantId,
  run,
  onInspect,
  onAccessFailure,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onInspect: (runId: string) => void;
  readonly onAccessFailure: (error: RunSupervisionFailure) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const read = useRunRetrySuccessor(
    open && run.supervisionRevision !== undefined
      ? {
          tenantId,
          runId: run.runId,
          expectedSupervisionRevision: run.supervisionRevision,
        }
      : null,
  );
  const failure =
    read.phase === 'failed' && read.error.kind !== 'successor-unsupported'
      ? read.error
      : undefined;
  useLayoutEffect(() => {
    if (failure !== undefined) onAccessFailure(failure);
  }, [failure, onAccessFailure]);
  useLayoutEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  return (
    <section
      aria-label="Retry successor lookup"
      className="space-y-3 rounded-md border border-border bg-surface/70 p-3"
    >
      <p className="text-sm leading-6 text-ink-muted">
        Recover a direct retry successor from recorded history. Both runs need
        independently current supervisor access; no browser control lease is
        required.
      </p>
      <Button
        ref={trigger}
        variant="quiet"
        size="compact"
        disabled={run.supervisionRevision === undefined}
        onClick={() => {
          if (open) trigger.current?.focus();
          setOpen(!open);
        }}
      >
        {open ? 'Close successor lookup' : 'Find visible retry successor'}
      </Button>
      {run.supervisionRevision === undefined ? (
        <p className="text-sm text-ink-muted">
          This snapshot has no supported supervision epoch. Successor lookup is
          unavailable.
        </p>
      ) : null}
      {open ? (
        <div className="space-y-3">
          <h4
            id={`successor-${id}`}
            ref={heading}
            tabIndex={-1}
            className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          >
            Protected successor observation
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="quiet"
              size="compact"
              disabled={read.phase === 'pending'}
              onClick={() => {
                heading.current?.focus();
                read.recheck();
              }}
            >
              Recheck successor access
            </Button>
          </div>
          {read.phase === 'ready' ? (
            <>
              <p className="text-xs leading-5 text-ink-muted [overflow-wrap:anywhere]">
                Authority observation{' '}
                <time dateTime={read.data.observedAt}>
                  {read.data.observedAt}
                </time>{' '}
                · Source supervision epoch {read.data.supervisionRevision}
              </p>
              {read.data.successor === null ? (
                <div role="status">
                  <p className="font-bold">
                    No currently visible direct successor
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    No retry, an unassigned target and an inaccessible target
                    have the same result. This does not prove that no retry
                    occurred.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-bold">Visible direct successor</p>
                  <p className="font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">
                    Run {read.data.successor.runId}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Target supervision epoch{' '}
                    {read.data.successor.supervisionRevision}
                  </p>
                  <Button
                    variant="quiet"
                    size="compact"
                    onClick={() => {
                      if (read.data.successor !== null)
                        onInspect(read.data.successor.runId);
                    }}
                  >
                    Inspect successor attempt
                  </Button>
                </div>
              )}
              <p className="text-xs leading-5 text-ink-muted">
                This relationship grants no access, command acknowledgement or
                execution authority. Opening it requires a fresh exact-run read;
                epochs can change before navigation.
              </p>
            </>
          ) : read.phase === 'failed' ? (
            <p role="status" className="text-sm leading-6 text-ink-muted">
              {read.error.kind === 'successor-unsupported'
                ? 'Successor lookup is unsupported by this server. This is not an absent retry; deploy the compatible backend. No internal fallback is used.'
                : 'Withdrawing earlier run context…'}
            </p>
          ) : (
            <p role="status" className="text-sm leading-6 text-ink-muted">
              Checking current source and target access… Earlier successor
              coordinates are hidden.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
