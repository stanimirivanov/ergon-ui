import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { ResolverObservationComparison } from './resolver-observation-comparison';
import { formatUtcInstant } from './resolver-observation-time';

type Observation = ResolverFollowUpCaseSummary['observations'][number];
type TimingFilter = 'all' | 'in-snapshot' | 'recorded-later';

/**
 * Inspects one authorized source observation at a time without treating its
 * untrusted content as a verified claim or retaining it outside the summary.
 */
export function ResolverObservationInspector({
  observations,
  pinnedVersion,
  regionId,
}: {
  readonly observations: ResolverFollowUpCaseSummary['observations'];
  readonly pinnedVersion: number;
  readonly regionId: string;
}): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [timingFilter, setTimingFilter] = useState<TimingFilter>('all');
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  const compareButton = useRef<HTMLButtonElement>(null);
  const focusDetailAfterSelection = useRef(false);
  const detailId = `${regionId}-observation-detail`;
  const listId = `${regionId}-observation-list`;
  const snapshotCount = observations.filter(
    (observation) => observation.streamVersion <= pinnedVersion,
  ).length;
  const visibleObservations = observations.filter((observation) => {
    if (timingFilter === 'all') {
      return true;
    }
    const isInSnapshot = observation.streamVersion <= pinnedVersion;
    return timingFilter === 'in-snapshot' ? isInSnapshot : !isInSnapshot;
  });
  // Resolve from the current authorized response, never from retained case data.
  const selected =
    visibleObservations.find(
      (observation) => observation.observationId === selectedId,
    ) ?? visibleObservations[0];
  const compared = visibleObservations.find(
    (observation) =>
      observation.observationId === comparisonId &&
      observation.observationId !== selected?.observationId,
  );
  const comparisonOptions = visibleObservations.filter(
    (observation) => observation.observationId !== selected?.observationId,
  );

  useEffect(() => {
    if (focusDetailAfterSelection.current) {
      detailHeading.current?.focus();
      focusDetailAfterSelection.current = false;
    }
  }, [selectedId]);

  function closeComparison(): void {
    setComparisonId(null);
    // Native dialog restoration runs after close; override it on the next task.
    window.setTimeout(() => compareButton.current?.focus(), 0);
  }

  function inspect(observation: Observation): void {
    if (
      selected?.observationId === observation.observationId &&
      selectedId !== null
    ) {
      detailHeading.current?.focus();
      return;
    }
    focusDetailAfterSelection.current = true;
    setComparisonId(null);
    setSelectedId(observation.observationId);
  }

  function filterByTiming(nextFilter: TimingFilter): void {
    setTimingFilter(nextFilter);
    // A hidden observation must not remain selected in the detail pane.
    setSelectedId(null);
    setComparisonId(null);
    focusDetailAfterSelection.current = false;
  }

  if (observations.length === 0) {
    return (
      <p className="mt-5 rounded-md border border-border bg-canvas p-4 text-sm text-ink-muted">
        No observations are recorded for this case.
      </p>
    );
  }

  return (
    <>
      <div
        role="group"
        aria-label="Filter observations by run snapshot"
        className="mt-5 flex flex-wrap gap-2"
      >
        {(
          [
            ['all', 'All', observations.length],
            ['in-snapshot', 'In run snapshot', snapshotCount],
            [
              'recorded-later',
              'Recorded later',
              observations.length - snapshotCount,
            ],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={timingFilter === value}
            aria-controls={listId}
            onClick={() => filterByTiming(value)}
            className={`min-h-11 rounded-md border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
              timingFilter === value
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-border bg-canvas/75 text-ink-muted hover:border-accent/70'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 text-xs text-ink-muted">
        Showing {visibleObservations.length} of {observations.length} recorded
        observations.
      </p>
      <ol
        id={listId}
        className="mt-3 grid gap-2"
        aria-label="Case observations"
      >
        {visibleObservations.map((observation) => {
          const isSelected =
            observation.observationId === selected?.observationId;
          return (
            <li key={observation.observationId}>
              <button
                ref={isSelected ? selectedButton : undefined}
                type="button"
                aria-label={`Inspect observation: ${observation.summary}`}
                aria-pressed={isSelected}
                aria-controls={detailId}
                onClick={() => inspect(observation)}
                className={`flex min-h-11 min-w-0 w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                  isSelected
                    ? 'border-accent bg-accent/15'
                    : 'border-border bg-canvas/75 hover:border-accent/70'
                }`}
              >
                <span className="break-words font-semibold text-ink">
                  {observation.summary}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>Version {observation.streamVersion}</span>
                  <span className="break-words">{observation.provider}</span>
                  <span>
                    {observation.streamVersion <= pinnedVersion
                      ? 'In run snapshot'
                      : 'Recorded later'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {selected === undefined ? (
        <p className="mt-5 rounded-md border border-border bg-canvas p-4 text-sm text-ink-muted">
          {timingFilter === 'in-snapshot'
            ? 'No observations were available at this run’s evidence snapshot.'
            : 'No observations were recorded after this run’s evidence snapshot.'}
        </p>
      ) : (
        <section
          id={detailId}
          aria-labelledby={`${detailId}-heading`}
          className="mt-5 min-w-0 rounded-md border border-border bg-canvas/75 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4
                ref={detailHeading}
                id={`${detailId}-heading`}
                tabIndex={-1}
                aria-describedby={`${detailId}-summary`}
                className="break-words font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
              >
                Source observation details
              </h4>
            </div>
            <button
              type="button"
              onClick={() => selectedButton.current?.focus()}
              className="min-h-11 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Back to observations
            </button>
          </div>
          <p
            id={`${detailId}-summary`}
            className="mt-4 break-words font-semibold text-ink"
          >
            {selected.summary}
          </p>
          <p className="mt-2 text-xs font-semibold text-accent-strong">
            {selected.streamVersion <= pinnedVersion
              ? 'In this run’s evidence snapshot'
              : 'Recorded after this run’s evidence snapshot'}
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
            {selected.content}
          </p>
          <dl className="mt-4 grid gap-3 border-t border-border pt-3 text-xs">
            <ObservationFact label="Source">
              {selected.originType} via {selected.provider}
            </ObservationFact>
            {selected.reference === null ? null : (
              <ObservationFact label="Source reference">
                {selected.reference}
              </ObservationFact>
            )}
            <ObservationFact label="Occurred">
              <time dateTime={selected.occurredAt}>
                {formatUtcInstant(selected.occurredAt)}
              </time>
            </ObservationFact>
            <ObservationFact label="Recorded">
              <time dateTime={selected.recordedAt}>
                {formatUtcInstant(selected.recordedAt)}
              </time>
            </ObservationFact>
          </dl>
          {comparisonOptions.length > 0 ? (
            <button
              ref={compareButton}
              type="button"
              aria-expanded={compared !== undefined}
              aria-controls={
                compared === undefined
                  ? undefined
                  : `${regionId}-source-comparison`
              }
              onClick={() =>
                setComparisonId(
                  compared === undefined
                    ? (comparisonOptions[0]?.observationId ?? null)
                    : null,
                )
              }
              className="mt-4 min-h-11 rounded-md border border-accent/60 px-3 py-2 text-xs font-semibold text-accent-strong hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              {compared === undefined ? 'Compare sources' : 'Close comparison'}
            </button>
          ) : null}
        </section>
      )}
      {selected !== undefined && compared !== undefined ? (
        <ResolverObservationComparison
          first={selected}
          second={compared}
          alternatives={comparisonOptions}
          pinnedVersion={pinnedVersion}
          regionId={regionId}
          onSecondSelected={setComparisonId}
          onClose={closeComparison}
        />
      ) : null}
    </>
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
      <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  );
}
