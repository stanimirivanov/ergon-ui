import type { FollowUpPriorityState } from '@ergon/follow-up-model';
import type { ReactElement } from 'react';

/** Current observed metadata only; text, not color alone, communicates the value. */
export function FollowUpPriorityLabel({
  value,
}: {
  readonly value: FollowUpPriorityState;
}): ReactElement {
  return (
    <span className="inline-flex flex-wrap gap-x-2 rounded border border-border px-2 py-1 text-xs font-bold text-ink">
      Priority {value.priority}
      <span className="font-normal text-ink-muted">
        revision {value.priorityRevision}
      </span>
    </span>
  );
}
