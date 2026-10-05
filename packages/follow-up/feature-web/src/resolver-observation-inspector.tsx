import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

type Observation = ResolverFollowUpCaseSummary['observations'][number];

const observedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

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
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  const focusDetailAfterSelection = useRef(false);
  const detailId = `${regionId}-observation-detail`;
  // Resolve from the current authorized response, never from retained case data.
  const selected =
    observations.find(
      (observation) => observation.observationId === selectedId,
    ) ?? observations[0];

  useEffect(() => {
    if (focusDetailAfterSelection.current) {
      detailHeading.current?.focus();
      focusDetailAfterSelection.current = false;
    }
  }, [selectedId]);

  function inspect(observation: Observation): void {
    if (
      selected?.observationId === observation.observationId &&
      selectedId !== null
    ) {
      detailHeading.current?.focus();
      return;
    }
    focusDetailAfterSelection.current = true;
    setSelectedId(observation.observationId);
  }

  if (selected === undefined) {
    return (
      <p className="mt-5 rounded-md border border-border bg-canvas p-4 text-sm text-ink-muted">
        No observations are recorded for this case.
      </p>
    );
  }

  return (
    <>
      <ol className="mt-5 grid gap-2" aria-label="Case observations">
        {observations.map((observation) => {
          const isSelected =
            observation.observationId === selected.observationId;
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
      </section>
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

function formatUtcInstant(value: string): string {
  return `${observedAtFormatter.format(new Date(value))} UTC`;
}
