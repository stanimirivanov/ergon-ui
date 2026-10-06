import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactNode } from 'react';

import { ResolverObservationInspector } from './resolver-observation-inspector';
import { ResolverRunAttemptHistory } from './resolver-run-attempt-history';

/**
 * Presents owner-authorized observations, durable attempts, and the pinned
 * outcome target. This is neither a live trace nor verified resolution;
 * untrusted observation content remains inert React text.
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
  const pinnedVersion = summary.resolutionRun.caseEvidenceStreamVersion;
  const visibleCount = summary.observations.filter(
    (observation) => observation.streamVersion <= pinnedVersion,
  ).length;

  return (
    <section
      id={regionId}
      aria-labelledby={`${regionId}-heading`}
      aria-busy={isFetching}
      className="min-w-0 pt-4"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
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

      <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.8fr)_minmax(19rem,1.05fr)]">
        <section
          aria-labelledby={`${regionId}-evidence-heading`}
          className="min-w-0 rounded-md border border-border bg-surface/90 p-4 xl:min-h-[calc(100vh-10.5rem)]"
        >
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Evidence & sources
          </p>
          <h3
            id={`${regionId}-evidence-heading`}
            className="mt-2 text-xl font-bold text-ink"
          >
            Recorded observations
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {visibleCount} available at the run snapshot ·{' '}
            {summary.observations.length - visibleCount} recorded later. These
            are source observations, not verified claims.
          </p>
          <ResolverObservationInspector
            observations={summary.observations}
            pinnedVersion={pinnedVersion}
            regionId={regionId}
          />
        </section>

        <section
          aria-labelledby={`${regionId}-run-heading`}
          className="min-w-0 rounded-md border border-border bg-surface/90 p-4 xl:min-h-[calc(100vh-10.5rem)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
                Resolution run
              </p>
              <h3
                id={`${regionId}-run-heading`}
                className="mt-2 text-xl font-bold text-ink"
              >
                Recorded attempts
              </h3>
            </div>
            <span className="rounded-md border border-highlight/55 bg-highlight/10 px-2.5 py-1 text-xs font-bold text-highlight">
              Escalated
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Durable attempt and transition records, not a live tool trace. The
            retry limit was reached after {summary.escalation.maximumAttempts}{' '}
            attempts.
          </p>
          <ResolverRunAttemptHistory attempts={summary.runHistory.attempts} />
          <section
            aria-labelledby={`${regionId}-handoff-heading`}
            className="mt-5 rounded-md border border-highlight/45 bg-highlight/5 p-4"
          >
            <h4
              id={`${regionId}-handoff-heading`}
              className="font-bold text-ink"
            >
              Automation handoff
            </h4>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              The {summary.failedExecution.connector} connector failed.
              Automated attempt {summary.escalation.sourceAttemptNumber} reached
              the configured limit of {summary.escalation.maximumAttempts}, so
              the case was escalated to human follow-up.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <CaseFact label="Capability">
                {summary.resolutionRun.capability}
              </CaseFact>
              <CaseFact label="Required approval">
                {summary.resolutionRun.requiredApproval}
              </CaseFact>
              <CaseFact label="Retry policy">
                {summary.escalation.retryPolicyRevision}
              </CaseFact>
              <CaseFact label="Attempt at handoff">
                {summary.escalation.sourceAttemptNumber} of{' '}
                {summary.escalation.maximumAttempts}
              </CaseFact>
            </dl>
          </section>
        </section>

        <section
          aria-labelledby={`${regionId}-proof-heading`}
          className="min-w-0 rounded-md border border-border bg-surface/90 p-4 lg:col-span-2 xl:col-span-1 xl:min-h-[calc(100vh-10.5rem)]"
        >
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Outcome target
          </p>
          <h3
            id={`${regionId}-proof-heading`}
            className="mt-2 text-xl font-bold text-ink"
          >
            Not assessed
          </h3>
          <p className="mt-2 text-sm text-ink-muted">
            This run never entered verification.
          </p>
          <div className="mt-5 rounded-md border border-accent/45 bg-accent/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
              Pinned success condition
            </p>
            <p className="mt-3 break-words text-lg font-semibold text-ink">
              {summary.outcomeProof.fact} = {summary.outcomeProof.expectedValue}
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            The target is not proof: there is no accepted proof of resolution
            for this escalated run.
          </p>
          <section
            aria-labelledby={`${regionId}-contract-heading`}
            className="mt-6 border-t border-border pt-5"
          >
            <h4
              id={`${regionId}-contract-heading`}
              className="font-bold text-ink"
            >
              Case and contract
            </h4>
            <dl className="mt-4 grid gap-4 text-sm">
              <CaseFact label="Case status">{summary.case.status}</CaseFact>
              <CaseFact label="Resolution contract">
                {summary.case.resolutionContract.key} revision{' '}
                {summary.case.resolutionContract.revision}
              </CaseFact>
              <CaseFact label="Run evidence boundary">
                Version {pinnedVersion} of {summary.case.streamVersion}
              </CaseFact>
              <CaseFact label="Escalated step">
                {summary.resolutionRun.stepId}
              </CaseFact>
            </dl>
          </section>
        </section>
      </div>
    </section>
  );
}

function CaseFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  );
}
