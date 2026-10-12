import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import type { ReactElement, Ref } from 'react';

export function ResolverObservationList({
  observations,
  selectedId,
  pinnedVersion,
  id,
  detailId,
  selectedButtonRef,
  onInspect,
}: {
  readonly observations: ResolverFollowUpCaseSummary['observations'];
  readonly selectedId: string | undefined;
  readonly pinnedVersion: number;
  readonly id: string;
  readonly detailId: string;
  readonly selectedButtonRef: Ref<HTMLButtonElement>;
  readonly onInspect: (observationId: string) => void;
}): ReactElement {
  return (
    <ol id={id} className="grid min-w-0 gap-2" aria-label="Case observations">
      {observations.map((observation) => {
        const isSelected = observation.observationId === selectedId;
        return (
          <li key={observation.observationId}>
            <Button
              ref={isSelected ? selectedButtonRef : undefined}
              type="button"
              variant="quiet"
              aria-label={`Inspect observation: ${observation.summary}`}
              aria-pressed={isSelected}
              aria-controls={detailId}
              onClick={() => onInspect(observation.observationId)}
              className={`w-full min-w-0 flex-col items-stretch justify-start rounded-md p-3 text-left focus-visible:ring-accent-strong ${isSelected ? 'border-accent bg-accent/15' : 'bg-canvas/75 hover:border-accent/70'}`}
            >
              <span className="font-semibold text-ink [overflow-wrap:anywhere]">
                {observation.summary}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span>Version {observation.streamVersion}</span>
                <span className="[overflow-wrap:anywhere]">
                  {observation.provider}
                </span>
                <span>
                  {observation.streamVersion <= pinnedVersion
                    ? 'In run snapshot'
                    : 'Recorded later'}
                </span>
              </span>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
