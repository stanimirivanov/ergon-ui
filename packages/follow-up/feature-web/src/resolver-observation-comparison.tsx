import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { useEffect, useRef, type ReactElement } from 'react';

import { formatUtcInstant } from './resolver-observation-time';

type Observation = ResolverFollowUpCaseSummary['observations'][number];

/**
 * Compares only source records from the current owner-authorized response.
 * The view makes no semantic binding or contradiction determination.
 */
export function ResolverObservationComparison({
  first,
  second,
  alternatives,
  pinnedVersion,
  regionId,
  onSecondSelected,
  onClose,
}: {
  readonly first: Observation;
  readonly second: Observation;
  readonly alternatives: readonly Observation[];
  readonly pinnedVersion: number;
  readonly regionId: string;
  readonly onSecondSelected: (observationId: string) => void;
  readonly onClose: () => void;
}): ReactElement {
  const id = `${regionId}-source-comparison`;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) {
        element.close();
      }
    };
  }, []);

  function dismiss(): void {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={`${id}-heading`}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(70rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-lg border border-accent/55 bg-surface/95 p-4 text-ink shadow-2xl backdrop:bg-black/75 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 id={`${id}-heading`} className="text-lg font-bold text-ink">
          Source comparison
        </h4>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          Close comparison
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Compare original source records. Similar or conflicting wording is not a
        verified claim or an assessed contradiction.
      </p>
      <label
        htmlFor={`${id}-second`}
        className="mt-4 block text-xs font-bold tracking-wide text-ink-muted uppercase"
      >
        Second observation
      </label>
      <select
        id={`${id}-second`}
        value={second.observationId}
        onChange={(event) => onSecondSelected(event.target.value)}
        className="mt-2 min-h-11 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
      >
        {alternatives.map((observation) => (
          <option
            key={observation.observationId}
            value={observation.observationId}
          >
            {observation.summary}
          </option>
        ))}
      </select>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
        <SourceRecord
          label="Selected source"
          observation={first}
          pinnedVersion={pinnedVersion}
        />
        <SourceRecord
          label="Comparison source"
          observation={second}
          pinnedVersion={pinnedVersion}
        />
      </div>
    </dialog>
  );
}

function SourceRecord({
  label,
  observation,
  pinnedVersion,
}: {
  readonly label: string;
  readonly observation: Observation;
  readonly pinnedVersion: number;
}): ReactElement {
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface p-3">
      <h5 className="text-xs font-bold tracking-wide text-accent-strong uppercase">
        {label}
      </h5>
      <p className="mt-2 break-words font-semibold text-ink">
        {observation.summary}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {observation.streamVersion <= pinnedVersion
          ? 'In run snapshot'
          : 'Recorded later'}{' '}
        · Version {observation.streamVersion}
      </p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {observation.content}
      </p>
      <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-xs">
        <div>
          <dt className="font-bold text-ink-muted">Source</dt>
          <dd className="break-words text-ink">
            {observation.originType} via {observation.provider}
          </dd>
        </div>
        {observation.reference === null ? null : (
          <div>
            <dt className="font-bold text-ink-muted">Reference</dt>
            <dd className="break-words text-ink">{observation.reference}</dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-ink-muted">Occurred</dt>
          <dd className="text-ink">
            <time dateTime={observation.occurredAt}>
              {formatUtcInstant(observation.occurredAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-ink-muted">Recorded</dt>
          <dd className="text-ink">
            <time dateTime={observation.recordedAt}>
              {formatUtcInstant(observation.recordedAt)}
            </time>
          </dd>
        </div>
      </dl>
    </article>
  );
}
