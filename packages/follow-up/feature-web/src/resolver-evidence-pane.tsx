import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, Ref } from 'react';

import { ResolverObservationInspector } from './resolver-observation-inspector';

export function ResolverEvidencePane({
  summary,
  regionId,
  headingRef,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly headingRef: Ref<HTMLHeadingElement>;
}): ReactElement {
  const pinnedVersion = summary.resolutionRun.caseEvidenceStreamVersion;
  const visibleCount = summary.observations.filter(
    (observation) => observation.streamVersion <= pinnedVersion,
  ).length;
  return (
    <section
      aria-labelledby={`${regionId}-evidence-heading`}
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
      <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
        Evidence & sources
      </p>
      <h3
        ref={headingRef}
        id={`${regionId}-evidence-heading`}
        tabIndex={-1}
        className="mt-2 scroll-mt-6 text-xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong focus:ring-offset-2 focus:ring-offset-canvas"
      >
        Recorded observations
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {visibleCount} available at the run snapshot ·{' '}
        {summary.observations.length - visibleCount} recorded later. These are
        source observations, not verified claims.
      </p>
      <div className="mt-5">
        <ResolverObservationInspector
          observations={summary.observations}
          pinnedVersion={pinnedVersion}
          regionId={regionId}
        />
      </div>
    </section>
  );
}
