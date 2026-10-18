import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';

/** Relationship facts come only from the currently disclosed run, not discovery or command history. */
export function AssignedRunAttemptContext({
  run,
  onInspectPredecessor,
}: {
  readonly run: AssignedRunConsole;
  readonly onInspectPredecessor: () => void;
}): ReactElement {
  return (
    <section
      aria-labelledby="run-attempt-heading"
      className="rounded-md border border-border bg-canvas/60 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="run-attempt-heading" className="font-bold text-accent-strong">
          Attempt context
        </h3>
        <span className="text-sm font-bold text-ink">
          Recorded attempt {run.attemptNumber}
        </span>
      </div>
      {run.predecessorRunId === null ? (
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This is the initial attempt. No predecessor is recorded.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            This attempt records an immediate predecessor. Its identity is a
            relationship, not permission to read that run or reuse its approval,
            execution or proof.
          </p>
          <p className="mt-3 font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">
            Predecessor {run.predecessorRunId}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={onInspectPredecessor}
            >
              Inspect predecessor attempt
            </Button>
          </div>
        </>
      )}
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        Attempt numbering is recorded history, not remaining retry budget or a
        complete retry tree. Each inspection requires a fresh authorized read.
      </p>
    </section>
  );
}
