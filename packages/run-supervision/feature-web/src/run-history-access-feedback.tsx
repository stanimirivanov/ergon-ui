import type { RunSupervisionFailure } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import { AssignedRunMessage } from './assigned-run-message';

/** Safe feedback survives private-context retirement; recovery reopens authority gates, never restores a snapshot. */
export function RunHistoryAccessFeedback({
  error,
  signInHref,
  onRecheck,
}: {
  readonly error: RunSupervisionFailure;
  readonly signInHref: string;
  readonly onRecheck: () => void;
}): ReactElement {
  return (
    <div className="space-y-3">
      <AssignedRunMessage
        title="Admission history unavailable"
        error={error}
        signInHref={signInHref}
      />
      <p className="text-sm leading-6 text-ink-muted">
        Earlier run context has been withdrawn. Recheck current run access
        before opening a new history observation.
      </p>
      <Button variant="quiet" onClick={onRecheck}>
        Recheck run access
      </Button>
    </div>
  );
}
