import type {
  AssignedRunPage,
  RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';

import { AssignedRunMessage } from './assigned-run-message';
import { formatRecordedAt, runStateLabels } from './run-supervision-copy';

export function AssignedRunList({
  page,
  selectedRunId,
  isFetching,
  error,
  signInHref,
  hasPrevious,
  onSelect,
  onRetry,
  onResetPage,
  onPrevious,
  onNext,
}: {
  readonly page: AssignedRunPage | undefined;
  readonly selectedRunId: string | null;
  readonly isFetching: boolean;
  readonly error: RunSupervisionFailure | undefined;
  readonly signInHref: string;
  readonly hasPrevious: boolean;
  readonly onSelect: (runId: string) => void;
  readonly onRetry: () => void;
  readonly onResetPage: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}): ReactElement {
  return (
    <section
      aria-labelledby="assigned-runs-heading"
      aria-busy={isFetching}
      className="min-w-0 rounded-md border border-border bg-surface/90 p-4 xl:min-h-[calc(100vh-12rem)]"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
        Your supervision work
      </p>
      <h2
        id="assigned-runs-heading"
        className="mt-2 text-xl font-extrabold tracking-tight"
      >
        Assigned runs
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Active runs assigned to your verified actor. Every read checks current
        resolver authority.
      </p>
      <div className="mt-5">
        {isFetching ? (
          <AssignedRunMessage
            title={
              page === undefined
                ? 'Loading assigned runs…'
                : 'Rechecking assigned runs…'
            }
            description="Requesting a fresh assignment snapshot. Selected private run context is hidden until this read succeeds."
          />
        ) : error !== undefined ? (
          <AssignedRunMessage
            title="Assigned runs could not be read"
            error={error}
            signInHref={signInHref}
            retryLabel="Retry assigned runs"
            onRetry={onRetry}
            onResetPage={onResetPage}
          />
        ) : page === undefined || page.entries.length === 0 ? (
          <AssignedRunMessage
            title="No active assigned runs"
            description="No active runs are available in this assignment view. This does not disclose runs assigned to others or establish authority."
          />
        ) : (
          <ul className="space-y-3" aria-label="Active assigned runs">
            {page.entries.map((entry) => (
              <li key={entry.runId}>
                <button
                  type="button"
                  aria-label={`Inspect run ${entry.runId}`}
                  aria-pressed={selectedRunId === entry.runId}
                  onClick={() => onSelect(entry.runId)}
                  className="w-full min-w-0 rounded-md border border-border bg-canvas/60 p-4 text-left hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <span className="block text-sm font-bold text-accent-strong">
                    {runStateLabels[entry.state]}
                  </span>
                  <span className="mt-2 block font-mono text-xs text-ink [overflow-wrap:anywhere]">
                    {entry.runId}
                  </span>
                  <span className="mt-3 block text-xs leading-5 text-ink-muted">
                    Case{' '}
                    <span className="font-mono [overflow-wrap:anywhere]">
                      {entry.caseId}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs text-ink-muted">
                    Assigned{' '}
                    <time dateTime={entry.assignedAt}>
                      {formatRecordedAt(entry.assignedAt)}
                    </time>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-ink-muted">
                    State version {entry.stateVersion} ·{' '}
                    <time dateTime={entry.stateUpdatedAt}>
                      {formatRecordedAt(entry.stateUpdatedAt)}
                    </time>
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-ink">
                    {selectedRunId === entry.runId
                      ? 'Selected run'
                      : 'Inspect recorded run →'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        role="group"
        aria-label="Assigned run pages"
        className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4"
      >
        <Button
          type="button"
          variant="quiet"
          size="compact"
          disabled={!hasPrevious || isFetching}
          onClick={onPrevious}
        >
          Previous assigned page
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="compact"
          disabled={
            isFetching || error !== undefined || page?.nextCursor == null
          }
          onClick={onNext}
        >
          Next assigned page
        </Button>
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        Assignment is not an exclusive control lease. No browser claim, timer,
        handover, or execution command is available here.
      </p>
    </section>
  );
}
