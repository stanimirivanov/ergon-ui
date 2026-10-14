import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode } from 'react';

export function AssignedRunPresence({
  presence,
  isReadingAssigned,
  hasSelectedRun,
  onRecheck,
  onClose,
  handoverControl,
  isCommandPending,
}: {
  readonly presence: ReactNode;
  readonly isReadingAssigned: boolean;
  readonly hasSelectedRun: boolean;
  readonly onRecheck: () => void;
  readonly onClose: () => void;
  readonly handoverControl?: ReactNode;
  readonly isCommandPending: boolean;
}): ReactElement {
  return (
    <section
      aria-label="Supervisor presence"
      className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface/90 px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
          Supervisor workspace
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Assignment and current resolver authority are checked by the control
          plane. This is a snapshot, not a control lease.
        </p>
      </div>
      {presence}
      <div className="flex flex-wrap gap-2">
        {handoverControl}
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
    </section>
  );
}
