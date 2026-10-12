import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { ModalDialog } from '@ergon/ui-web';
import type { ReactElement, RefObject } from 'react';

import { ResolverObservationProvenance } from './resolver-observation-provenance';

type Observation = ResolverFollowUpCaseSummary['observations'][number];

/** Current source records only; this presentation does not assess contradictions. */
export function ResolverObservationComparison({
  first,
  second,
  alternatives,
  pinnedVersion,
  regionId,
  returnFocusRef,
  onSecondSelected,
  onClose,
}: {
  readonly first: Observation;
  readonly second: Observation;
  readonly alternatives: readonly Observation[];
  readonly pinnedVersion: number;
  readonly regionId: string;
  readonly returnFocusRef: RefObject<HTMLButtonElement | null>;
  readonly onSecondSelected: (observationId: string) => void;
  readonly onClose: () => void;
}): ReactElement {
  const id = `${regionId}-source-comparison`;
  return (
    <ModalDialog
      id={id}
      title="Source comparison"
      dismissLabel="Close comparison"
      onDismiss={onClose}
      returnFocusRef={returnFocusRef}
    >
      <div className="grid min-w-0 gap-4">
        <p className="text-sm leading-6 text-ink-muted">
          Compare original source records. Similar or conflicting wording is not
          a verified claim or an assessed contradiction.
        </p>
        <div className="grid gap-2">
          <label
            htmlFor={`${id}-second`}
            className="text-xs font-bold tracking-wide text-ink-muted uppercase"
          >
            Second observation
          </label>
          <select
            id={`${id}-second`}
            value={second.observationId}
            onChange={(event) => onSecondSelected(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
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
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
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
      </div>
    </ModalDialog>
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
    <article className="grid min-w-0 content-start gap-3 rounded-md border border-border bg-surface p-3">
      <h3 className="text-xs font-bold tracking-wide text-accent-strong uppercase">
        {label}
      </h3>
      <div className="grid gap-1">
        <p className="font-semibold text-ink [overflow-wrap:anywhere]">
          {observation.summary}
        </p>
        <p className="text-xs text-ink-muted">
          {observation.streamVersion <= pinnedVersion
            ? 'In run snapshot'
            : 'Recorded later'}{' '}
          · Version {observation.streamVersion}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]">
        {observation.content}
      </p>
      <div className="border-t border-border pt-3">
        <ResolverObservationProvenance observation={observation} />
      </div>
    </article>
  );
}
