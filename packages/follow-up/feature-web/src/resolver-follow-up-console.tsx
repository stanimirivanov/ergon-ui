import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import {
  useCallback,
  useLayoutEffect,
  useState,
  type ReactElement,
} from 'react';
import { Button } from '@ergon/ui-web';
import { ResolverContextWithheld } from './resolver-context-withheld';

import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

/**
 * Binds current ownership to private context. A denied notes inspection retires
 * both resources before persistent toolbar focus is restored outside the modal.
 */
export function ResolverFollowUpConsole({
  tenantId,
  signInHref,
  item,
  onBeforeRetry,
  onRecheckOwnership,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onBeforeRetry: () => void;
  readonly onRecheckOwnership: () => void;
}): ReactElement {
  const [notesAccessLost, setNotesAccessLost] = useState(false);
  const withdrawNotes = useCallback(() => setNotesAccessLost(true), []);
  useLayoutEffect(() => {
    if (notesAccessLost) onBeforeRetry();
  }, [notesAccessLost, onBeforeRetry]);
  if (notesAccessLost) {
    return (
      <ResolverContextWithheld
        id={`case-context-${item.workItem.workItemId}`}
        title="Owner-scoped context withdrawn"
        description="Notes access or claim validation failed. Prior case context and notes are hidden; recheck current ownership before continuing."
        action={
          <Button
            type="button"
            onClick={() => {
              onBeforeRetry();
              onRecheckOwnership();
            }}
          >
            Recover owner-scoped context
          </Button>
        }
      />
    );
  }
  return (
    <ResolverFollowUpCaseSummary
      tenantId={tenantId}
      signInHref={signInHref}
      workItemId={item.workItem.workItemId}
      caseId={item.workItem.caseId}
      runId={item.workItem.runId}
      regionId={`case-context-${item.workItem.workItemId}`}
      onBeforeRetry={onBeforeRetry}
      claimId={item.claim.claimId}
      ownershipRevision={item.workItem.ownershipRevision}
      onNotesAccessLost={withdrawNotes}
    />
  );
}
