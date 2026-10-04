import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactNode } from 'react';

const observedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/**
 * Renders a validated, server-authorized evidence snapshot as inert text.
 *
 * The view owns no fetching or authority decisions. Observation content is
 * rendered through React text nodes and is never interpreted as markup. The
 * evidence-first order is also the reading order when the columns collapse.
 */
export function ResolverFollowUpCaseSummaryView({
  summary,
  regionId,
  isFetching,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly isFetching: boolean;
}): ReactNode {
  return (
    <section
      id={regionId}
      aria-labelledby={`${regionId}-heading`}
      className="mt-5 min-w-0 border-t border-border pt-5"
      aria-busy={isFetching}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Case context · read only
          </p>
          <h4
            id={`${regionId}-heading`}
            className="mt-2 break-words text-xl font-bold text-ink"
          >
            {summary.case.goal}
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Review the recorded evidence and failed automation before deciding
            what to do next. This open case has no verified resolution in this
            view.
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-2"
          aria-label="Case and run status"
        >
          <ContextBadge>Case {summary.case.status}</ContextBadge>
          <ContextBadge>Run {summary.resolutionRun.state}</ContextBadge>
          <ContextBadge>
            {summary.resolutionRun.effectiveRisk} risk
          </ContextBadge>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <section
          aria-labelledby={`${regionId}-evidence-heading`}
          className="min-w-0 rounded-xl border border-accent/35 bg-surface-strong p-4 sm:p-5"
        >
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            01 · Evidence
          </p>
          <h5
            id={`${regionId}-evidence-heading`}
            className="mt-2 text-base font-bold text-ink"
          >
            Recorded observations
          </h5>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            {summary.observations.length}{' '}
            {summary.observations.length === 1 ? 'observation' : 'observations'}
            {' · '}evidence through stream version{' '}
            {summary.resolutionRun.caseEvidenceStreamVersion}
          </p>
          {summary.observations.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              No observations were recorded at this evidence boundary.
            </p>
          ) : (
            <ol className="mt-4 grid gap-3" aria-label="Case observations">
              {summary.observations.map((observation) => (
                <li
                  key={observation.observationId}
                  className="min-w-0 rounded-lg border border-border bg-canvas/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-bold text-ink">
                      {observation.summary}
                    </p>
                    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-xs text-ink-muted">
                      Version {observation.streamVersion}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                    {observation.content}
                  </p>
                  <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
                    <ContextFact label="Source">
                      {observation.originType} via {observation.provider}
                    </ContextFact>
                    {observation.reference === null ? null : (
                      <ContextFact label="Source reference">
                        {observation.reference}
                      </ContextFact>
                    )}
                    <ContextFact label="Occurred">
                      <time dateTime={observation.occurredAt}>
                        {formatUtcInstant(observation.occurredAt)}
                      </time>
                    </ContextFact>
                    <ContextFact label="Recorded">
                      <time dateTime={observation.recordedAt}>
                        {formatUtcInstant(observation.recordedAt)}
                      </time>
                    </ContextFact>
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid min-w-0 gap-4">
          <section
            aria-labelledby={`${regionId}-handoff-heading`}
            className="min-w-0 rounded-xl border border-border bg-canvas/60 p-4 sm:p-5"
          >
            <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
              02 · Execution
            </p>
            <h5
              id={`${regionId}-handoff-heading`}
              className="mt-2 text-base font-bold text-ink"
            >
              Automation handoff
            </h5>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              The {summary.failedExecution.connector} connector failed.
              Automated attempt {summary.escalation.sourceAttemptNumber} reached
              the configured limit of {summary.escalation.maximumAttempts}, so
              the case was escalated to human follow-up.
            </p>
            <dl className="mt-4 grid gap-x-4 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <ContextFact label="Escalated step">
                {summary.resolutionRun.stepId}
              </ContextFact>
              <ContextFact label="Capability">
                {summary.resolutionRun.capability}
              </ContextFact>
              <ContextFact label="Required approval">
                {summary.resolutionRun.requiredApproval}
              </ContextFact>
              <ContextFact label="Connector">
                {summary.failedExecution.connector}
              </ContextFact>
              <ContextFact label="Execution result">Failed</ContextFact>
              <ContextFact label="Execution completed">
                <time dateTime={summary.failedExecution.completedAt}>
                  {formatUtcInstant(summary.failedExecution.completedAt)}
                </time>
              </ContextFact>
              <ContextFact label="Retry policy">
                {summary.escalation.retryPolicyRevision}
              </ContextFact>
              <ContextFact label="Attempt at handoff">
                {summary.escalation.sourceAttemptNumber} of{' '}
                {summary.escalation.maximumAttempts}
              </ContextFact>
              <ContextFact label="Escalated">
                <time dateTime={summary.escalation.occurredAt}>
                  {formatUtcInstant(summary.escalation.occurredAt)}
                </time>
              </ContextFact>
            </dl>
          </section>

          <section
            aria-labelledby={`${regionId}-contract-heading`}
            className="min-w-0 rounded-xl border border-border bg-canvas/60 p-4 sm:p-5"
          >
            <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
              03 · Case
            </p>
            <h5
              id={`${regionId}-contract-heading`}
              className="mt-2 text-base font-bold text-ink"
            >
              Case and contract
            </h5>
            <dl className="mt-4 grid gap-x-4 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <ContextFact label="Case status">
                {summary.case.status}
              </ContextFact>
              <ContextFact label="Resolution contract">
                {summary.case.resolutionContract.key} revision{' '}
                {summary.case.resolutionContract.revision}
              </ContextFact>
              <ContextFact label="Evidence boundary">
                Version {summary.resolutionRun.caseEvidenceStreamVersion} of{' '}
                {summary.case.streamVersion}
              </ContextFact>
            </dl>
          </section>
        </div>
      </div>
    </section>
  );
}

function ContextBadge({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  return (
    <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold tracking-wide text-accent-strong uppercase">
      {children}
    </span>
  );
}

function ContextFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="font-bold text-ink">{label}</dt>
      <dd className="mt-1 break-words text-ink-muted">{children}</dd>
    </div>
  );
}

function formatUtcInstant(value: string): string {
  return `${observedAtFormatter.format(new Date(value))} UTC`;
}
