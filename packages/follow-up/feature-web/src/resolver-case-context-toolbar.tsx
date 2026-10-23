import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, ReactNode } from 'react';

const sectionJumpClass =
  'min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function ResolverCaseContextToolbar({
  summary,
  regionId,
  onEvidence,
  onAttempts,
  onOutcome,
  notes,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly onEvidence: () => void;
  readonly onAttempts: () => void;
  readonly onOutcome: () => void;
  readonly notes?: ReactNode;
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
            Owner-scoped case context · read only
          </p>
          <h2
            id={`${regionId}-heading`}
            className="mt-1 break-words text-xl font-bold tracking-tight text-ink sm:text-2xl"
          >
            {summary.case.goal}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Failed automation needs human follow-up. There is no verified
            resolution in this view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold tracking-wide uppercase">
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-ink-muted">
            Case {summary.case.status}
          </span>
          <span className="rounded-md border border-highlight/55 bg-highlight/10 px-2.5 py-1.5 text-highlight">
            Run {summary.resolutionRun.state}
          </span>
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-ink-muted">
            {summary.resolutionRun.effectiveRisk} risk
          </span>
        </div>
      </div>
      <div
        role="group"
        aria-label="Console section jumps"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">
          Jump to
        </span>
        <button
          type="button"
          aria-label="Jump to evidence"
          onClick={onEvidence}
          className={sectionJumpClass}
        >
          Evidence
        </button>
        <button
          type="button"
          aria-label="Jump to attempts"
          onClick={onAttempts}
          className={sectionJumpClass}
        >
          Attempts
        </button>
        <button
          type="button"
          aria-label="Jump to outcome"
          onClick={onOutcome}
          className={sectionJumpClass}
        >
          Outcome
        </button>
        {notes}
      </div>
    </div>
  );
}
