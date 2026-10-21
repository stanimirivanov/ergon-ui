import type { RunInspectionFailure } from './use-run-inspection-access';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import { AssignedRunMessage } from './assigned-run-message';

/** Safe feedback survives private-context retirement; recovery reopens authority gates, never restores a snapshot. */
export function RunInspectionAccessFeedback({
  failure,
  signInHref,
  onRecheck,
}: {
  readonly failure: RunInspectionFailure;
  readonly signInHref: string;
  readonly onRecheck: () => void;
}): ReactElement {
  return (
    <div className="space-y-3">
      <AssignedRunMessage
        title={inspectionFailureTitles[failure.resource]}
        error={failure.error}
        signInHref={signInHref}
      />
      <p className="text-sm leading-6 text-ink-muted">
        Earlier run context has been withdrawn. Recheck current run access
        before requesting a new protected observation.
      </p>
      <Button variant="quiet" onClick={onRecheck}>
        Recheck run access
      </Button>
    </div>
  );
}

const inspectionFailureTitles = {
  contract: 'Pinned contract unavailable',
  history: 'Admission history unavailable',
  successor: 'Successor lookup unavailable',
  invocation: 'Gateway history unavailable',
} as const;
