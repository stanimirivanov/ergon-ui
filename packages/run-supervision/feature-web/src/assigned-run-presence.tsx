import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode } from 'react';

/**
 * Keeps supervision actions and current control visible above the panes.
 * Only static authority guidance is collapsible; opening it has no request,
 * selection or authority side effect. Independent slots retain their wrappers.
 */
export function AssignedRunPresence({
  presence,
  isReadingAssigned,
  hasSelectedRun,
  onRecheck,
  onClose,
  handoverControl,
  controlPanel,
  isCommandPending,
  sectionNavigation,
}: {
  readonly presence: ReactNode;
  readonly isReadingAssigned: boolean;
  readonly hasSelectedRun: boolean;
  readonly onRecheck: () => void;
  readonly onClose: () => void;
  readonly handoverControl?: ReactNode;
  readonly controlPanel?: ReactNode;
  readonly isCommandPending: boolean;
  /** Focus-only pane navigation remains usable independently of authority gates. */
  readonly sectionNavigation?: ReactNode;
}): ReactElement {
  return (
    <section
      aria-label="Supervisor presence"
      className="grid min-w-0 gap-3 rounded-md border border-border bg-surface/90 px-4 py-3"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Supervisor workspace
          </p>
          <div className="min-w-0">{presence}</div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div>{handoverControl}</div>
          <Button
            type="button"
            variant="quiet"
            size="compact"
            disabled={isReadingAssigned}
            onClick={onRecheck}
          >
            Recheck assigned runs
          </Button>
          {hasSelectedRun ? (
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={onClose}
              disabled={isCommandPending}
            >
              Close run
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-w-0">{controlPanel}</div>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-t border-border pt-2">
        {sectionNavigation === undefined ? null : (
          <div className="min-w-0">{sectionNavigation}</div>
        )}
        <details className="min-w-0 max-w-prose text-xs text-ink-muted">
          <summary className="cursor-pointer rounded py-2 font-bold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong">
            Supervision and authority boundaries
          </summary>
          <p className="mt-2 leading-5">
            Assignment and current resolver authority are checked by the control
            plane. Browser control is separately observed above; neither display
            is execution authority.
          </p>
        </details>
      </div>
    </section>
  );
}
