import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, ReactNode } from 'react';

import { formatUtcInstant } from './resolver-observation-time';

/** The same inert provenance fields accompany detail and comparison records. */
export function ResolverObservationProvenance({
  observation,
}: {
  readonly observation: ResolverFollowUpCaseSummary['observations'][number];
}): ReactElement {
  return (
    <dl className="grid min-w-0 gap-3 text-xs">
      <ObservationFact label="Source">
        {observation.originType} via {observation.provider}
      </ObservationFact>
      {observation.reference === null ? null : (
        <ObservationFact label="Source reference">
          {observation.reference}
        </ObservationFact>
      )}
      <ObservationFact label="Occurred">
        <time dateTime={observation.occurredAt}>
          {formatUtcInstant(observation.occurredAt)}
        </time>
      </ObservationFact>
      <ObservationFact label="Recorded">
        <time dateTime={observation.recordedAt}>
          {formatUtcInstant(observation.recordedAt)}
        </time>
      </ObservationFact>
    </dl>
  );
}

function ObservationFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
