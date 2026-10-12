import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import type { ReactElement, Ref } from 'react';

import { ResolverObservationProvenance } from './resolver-observation-provenance';

export function ResolverObservationDetail({
  observation,
  pinnedVersion,
  id,
  headingRef,
  compareButtonRef,
  canCompare,
  isComparing,
  comparisonId,
  onBack,
  onCompare,
}: {
  readonly observation: ResolverFollowUpCaseSummary['observations'][number];
  readonly pinnedVersion: number;
  readonly id: string;
  readonly headingRef: Ref<HTMLHeadingElement>;
  readonly compareButtonRef: Ref<HTMLButtonElement>;
  readonly canCompare: boolean;
  readonly isComparing: boolean;
  readonly comparisonId: string;
  readonly onBack: () => void;
  readonly onCompare: () => void;
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="grid min-w-0 gap-4 rounded-md border border-border bg-canvas/75 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4
          ref={headingRef}
          id={`${id}-heading`}
          tabIndex={-1}
          aria-describedby={`${id}-summary`}
          className="font-bold text-ink [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          Source observation details
        </h4>
        <Button
          type="button"
          variant="quiet"
          className="rounded-md text-xs focus-visible:ring-accent-strong"
          onClick={onBack}
        >
          Back to observations
        </Button>
      </div>
      <div className="grid gap-2">
        <p
          id={`${id}-summary`}
          className="font-semibold text-ink [overflow-wrap:anywhere]"
        >
          {observation.summary}
        </p>
        <p className="text-xs font-semibold text-accent-strong">
          {observation.streamVersion <= pinnedVersion
            ? 'In this run’s evidence snapshot'
            : 'Recorded after this run’s evidence snapshot'}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]">
        {observation.content}
      </p>
      <div className="border-t border-border pt-3">
        <ResolverObservationProvenance observation={observation} />
      </div>
      {canCompare ? (
        <div>
          <Button
            ref={compareButtonRef}
            type="button"
            variant="quiet"
            aria-haspopup="dialog"
            aria-expanded={isComparing}
            aria-controls={isComparing ? comparisonId : undefined}
            onClick={onCompare}
            className="rounded-md border-accent/60 text-xs text-accent-strong hover:bg-accent/10 focus-visible:ring-accent-strong"
          >
            Compare sources
          </Button>
        </div>
      ) : null}
    </section>
  );
}
