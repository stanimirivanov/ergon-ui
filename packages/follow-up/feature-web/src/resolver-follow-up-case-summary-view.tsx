import type { ResolverFollowUpCaseSummary } from '@ergon/domain-follow-up';
import type { ReactNode } from 'react';

const observedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/**
 * Renders a validated, server-authorized evidence snapshot as inert text.
 *
 * The view owns no fetching or authority decisions. Observation content is
 * rendered through React text nodes and is never interpreted as markup.
 */
export function ResolverFollowUpCaseSummaryView({
  summary,
  regionId,
  isFetching,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly isFetching: boolean;
}) {
  return (
    <section
      id={regionId}
      aria-labelledby={`${regionId}-heading`}
      className="mt-5 border-t border-border pt-5"
      aria-busy={isFetching}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Case context
          </p>
          <h4
            id={`${regionId}-heading`}
            className="mt-2 text-lg font-bold text-ink"
          >
            {summary.case.goal}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Case and run status">
          <ContextBadge>{summary.case.status}</ContextBadge>
          <ContextBadge>
            {summary.resolutionRun.effectiveRisk} risk
          </ContextBadge>
          <ContextBadge>{summary.resolutionRun.state}</ContextBadge>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <ContextFact label="Resolution contract">
          {summary.case.resolutionContract.key} revision{' '}
          {summary.case.resolutionContract.revision}
        </ContextFact>
        <ContextFact label="Capability">
          {summary.resolutionRun.capability}
        </ContextFact>
        <ContextFact label="Escalated step">
          {summary.resolutionRun.stepId}
        </ContextFact>
        <ContextFact label="Required approval">
          {summary.resolutionRun.requiredApproval}
        </ContextFact>
        <ContextFact label="Attempt">
          {summary.resolutionRun.attemptNumber}
        </ContextFact>
        <ContextFact label="Evidence boundary">
          Version {summary.resolutionRun.caseEvidenceStreamVersion} of{' '}
          {summary.case.streamVersion}
        </ContextFact>
      </dl>

      <section
        aria-labelledby={`${regionId}-handoff-heading`}
        className="mt-6 rounded-xl border border-border bg-canvas/60 p-4"
      >
        <h5
          id={`${regionId}-handoff-heading`}
          className="text-sm font-bold text-ink"
        >
          Automation handoff
        </h5>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          The {summary.failedExecution.connector} connector failed. Automated
          attempt {summary.escalation.sourceAttemptNumber} reached the
          configured limit of {summary.escalation.maximumAttempts}, so the case
          was escalated to human follow-up.
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="mt-6">
        <h5 className="text-sm font-bold text-ink">Recorded observations</h5>
        {summary.observations.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            No observations were recorded at this evidence boundary.
          </p>
        ) : (
          <ol className="mt-3 grid gap-3" aria-label="Case observations">
            {summary.observations.map((observation) => (
              <li
                key={observation.observationId}
                className="rounded-xl border border-border bg-canvas/60 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-ink">{observation.summary}</p>
                  <p className="text-xs text-ink-muted">
                    Version {observation.streamVersion}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {observation.content}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  {observation.originType} via {observation.provider}
                  {observation.reference === null
                    ? ''
                    : ` · ${observation.reference}`}{' '}
                  ·{' '}
                  <time dateTime={observation.occurredAt}>
                    {formatUtcInstant(observation.occurredAt)}
                  </time>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function ContextBadge({ children }: { readonly children: ReactNode }) {
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
}) {
  return (
    <div>
      <dt className="font-bold text-ink">{label}</dt>
      <dd className="mt-1 break-words text-ink-muted">{children}</dd>
    </div>
  );
}

function formatUtcInstant(value: string): string {
  return `${observedAtFormatter.format(new Date(value))} UTC`;
}
