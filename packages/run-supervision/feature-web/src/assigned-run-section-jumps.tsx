import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';

/**
 * Focus-only navigation to persistent pane headings, including withheld states.
 * Callbacks belong to workspace composition; no URL, selection, resource or
 * authority state is changed and no deferred focus survives withdrawal.
 */
export function AssignedRunSectionJumps({
  onAssigned,
  onEvidence,
  onExecution,
  onOutcome,
}: {
  readonly onAssigned: () => void;
  readonly onEvidence: () => void;
  readonly onExecution: () => void;
  readonly onOutcome: () => void;
}): ReactElement {
  return (
    <div
      role="group"
      aria-label="Console section jumps"
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">
        Jump to
      </span>
      <Button
        type="button"
        variant="quiet"
        size="compact"
        aria-label="Jump to assigned runs"
        onClick={onAssigned}
      >
        Assigned runs
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="compact"
        aria-label="Jump to case evidence"
        onClick={onEvidence}
      >
        Evidence
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="compact"
        onClick={onExecution}
        aria-label="Jump to execution"
      >
        Execution
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="compact"
        aria-label="Jump to outcome proof"
        onClick={onOutcome}
      >
        Outcome proof
      </Button>
    </div>
  );
}
