import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, Ref } from 'react';

import { ResolverCaseFact } from './resolver-case-fact';
import { ResolverRunAttemptHistory } from './resolver-run-attempt-history';

export function ResolverExecutionPane({
  summary,
  regionId,
  headingRef,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly headingRef: Ref<HTMLHeadingElement>;
}): ReactElement {
  return (
    <section
      aria-labelledby={`${regionId}-run-heading`}
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Resolution run
          </p>
          <h3
            ref={headingRef}
            id={`${regionId}-run-heading`}
            tabIndex={-1}
            className="mt-2 scroll-mt-6 text-xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong focus:ring-offset-2 focus:ring-offset-canvas"
          >
            Recorded attempts
          </h3>
        </div>
        <span className="rounded-md border border-highlight/55 bg-highlight/10 px-2.5 py-1 text-xs font-bold text-highlight">
          Escalated
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Durable attempt and transition records, not a live tool trace. The retry
        limit was reached after {summary.escalation.maximumAttempts} attempts.
      </p>
      <section
        aria-labelledby={`${regionId}-policy-heading`}
        className="mt-4 rounded-md border border-highlight/55 bg-highlight/5 p-4"
      >
        <h4 id={`${regionId}-policy-heading`} className="font-bold text-ink">
          Recorded execution policy
        </h4>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          These are the escalated run’s recorded policy inputs, not a current
          approval decision. This read-only view cannot authorize or resume
          execution.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <ResolverCaseFact label="Capability">
            {summary.resolutionRun.capability}
          </ResolverCaseFact>
          <ResolverCaseFact label="Effective risk">
            {summary.resolutionRun.effectiveRisk}
          </ResolverCaseFact>
          <ResolverCaseFact label="Approval requirement">
            {summary.resolutionRun.requiredApproval}
          </ResolverCaseFact>
          <ResolverCaseFact label="Policy revision">
            {summary.resolutionRun.policyRevision}
          </ResolverCaseFact>
        </dl>
      </section>
      <ResolverRunAttemptHistory attempts={summary.runHistory.attempts} />
      <section
        aria-labelledby={`${regionId}-handoff-heading`}
        className="mt-5 rounded-md border border-highlight/45 bg-highlight/5 p-4"
      >
        <h4 id={`${regionId}-handoff-heading`} className="font-bold text-ink">
          Automation handoff
        </h4>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          The {summary.failedExecution.connector} connector failed. Automated
          attempt {summary.escalation.sourceAttemptNumber} reached the
          configured limit of {summary.escalation.maximumAttempts}, so the case
          was escalated to human follow-up.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <ResolverCaseFact label="Retry policy">
            {summary.escalation.retryPolicyRevision}
          </ResolverCaseFact>
          <ResolverCaseFact label="Attempt at handoff">
            {summary.escalation.sourceAttemptNumber} of{' '}
            {summary.escalation.maximumAttempts}
          </ResolverCaseFact>
        </dl>
      </section>
    </section>
  );
}
