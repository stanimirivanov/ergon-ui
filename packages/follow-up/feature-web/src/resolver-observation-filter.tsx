import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';

export type ObservationTimingFilter = 'all' | 'in-snapshot' | 'recorded-later';

export function ResolverObservationFilter({
  value,
  total,
  snapshotCount,
  visibleCount,
  listId,
  onChange,
}: {
  readonly value: ObservationTimingFilter;
  readonly total: number;
  readonly snapshotCount: number;
  readonly visibleCount: number;
  readonly listId: string;
  readonly onChange: (value: ObservationTimingFilter) => void;
}): ReactElement {
  return (
    <div className="grid gap-3">
      <div
        role="group"
        aria-label="Filter observations by run snapshot"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ['all', 'All', total],
            ['in-snapshot', 'In run snapshot', snapshotCount],
            ['recorded-later', 'Recorded later', total - snapshotCount],
          ] as const
        ).map(([filter, label, count]) => (
          <Button
            key={filter}
            type="button"
            variant="quiet"
            aria-pressed={value === filter}
            aria-controls={listId}
            onClick={() => onChange(filter)}
            className={`rounded-md text-xs focus-visible:ring-accent-strong ${value === filter ? 'border-accent bg-accent/15 text-ink' : 'bg-canvas/75 text-ink-muted hover:border-accent/70'}`}
          >
            {label} ({count})
          </Button>
        ))}
      </div>
      <p role="status" className="text-xs text-ink-muted">
        Showing {visibleCount} of {total} recorded observations.
      </p>
    </div>
  );
}
