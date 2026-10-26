import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { ThreePaneLayout } from '@ergon/ui-web';
import { useRef, type ReactElement, type ReactNode } from 'react';

import { ResolverCaseContextToolbar } from './resolver-case-context-toolbar';
import { ResolverEvidencePane } from './resolver-evidence-pane';
import { ResolverExecutionPane } from './resolver-execution-pane';
import { ResolverOutcomePane } from './resolver-outcome-pane';

/**
 * Composes authorized case projections into named panes. Section focus is local,
 * not a URL; pane interactions and source inspection retain their own lifetimes.
 */
export function ResolverFollowUpCaseSummaryView({
  summary,
  regionId,
  isFetching,
  inspectionActions,
}: {
  readonly summary: ResolverFollowUpCaseSummary;
  readonly regionId: string;
  readonly isFetching: boolean;
  readonly inspectionActions?: ReactNode;
}): ReactElement {
  const evidenceHeading = useRef<HTMLHeadingElement>(null);
  const runHeading = useRef<HTMLHeadingElement>(null);
  const proofHeading = useRef<HTMLHeadingElement>(null);
  return (
    <section
      id={regionId}
      aria-labelledby={`${regionId}-heading`}
      aria-busy={isFetching}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
    >
      <ResolverCaseContextToolbar
        summary={summary}
        regionId={regionId}
        onEvidence={() => evidenceHeading.current?.focus()}
        onAttempts={() => runHeading.current?.focus()}
        onOutcome={() => proofHeading.current?.focus()}
        inspectionActions={inspectionActions}
      />
      <ThreePaneLayout
        leadingLabel="Case evidence"
        primaryLabel="Case execution"
        trailingLabel="Outcome proof"
        leading={
          <ResolverEvidencePane
            summary={summary}
            regionId={regionId}
            headingRef={evidenceHeading}
          />
        }
        primary={
          <ResolverExecutionPane
            summary={summary}
            regionId={regionId}
            headingRef={runHeading}
          />
        }
        trailing={
          <ResolverOutcomePane
            summary={summary}
            regionId={regionId}
            headingRef={proofHeading}
          />
        }
      />
    </section>
  );
}
