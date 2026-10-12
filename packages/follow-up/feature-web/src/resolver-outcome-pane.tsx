import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, Ref } from 'react';

import { ResolverCaseFact } from './resolver-case-fact';

export function ResolverOutcomePane({
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
      aria-labelledby={`${regionId}-proof-heading`}
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
      <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
        Outcome target
      </p>
      <h3
        ref={headingRef}
        id={`${regionId}-proof-heading`}
        tabIndex={-1}
        className="mt-2 scroll-mt-6 text-xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong focus:ring-offset-2 focus:ring-offset-canvas"
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
        The target is not proof: there is no accepted proof of resolution for
        this escalated run.
      </p>
      <section
        aria-labelledby={`${regionId}-contract-heading`}
        className="mt-6 border-t border-border pt-5"
      >
        <h4 id={`${regionId}-contract-heading`} className="font-bold text-ink">
          Case and contract
        </h4>
        <dl className="mt-4 grid gap-4 text-sm">
          <ResolverCaseFact label="Case status">
            {summary.case.status}
          </ResolverCaseFact>
          <ResolverCaseFact label="Resolution contract">
            {summary.case.resolutionContract.key} revision{' '}
            {summary.case.resolutionContract.revision}
          </ResolverCaseFact>
          <ResolverCaseFact label="Run evidence boundary">
            Version {summary.resolutionRun.caseEvidenceStreamVersion} of{' '}
            {summary.case.streamVersion}
          </ResolverCaseFact>
          <ResolverCaseFact label="Escalated step">
            {summary.resolutionRun.stepId}
          </ResolverCaseFact>
        </dl>
      </section>
    </section>
  );
}
