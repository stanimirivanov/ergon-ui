import { useFreshResolverFollowUpCaseSummary } from '@ergon/follow-up-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import { FollowUpNotesInspector } from './follow-up-notes-inspector';
import { FollowUpQuestionsInspector } from './follow-up-questions-inspector';

import { caseSummaryFailureCopy } from './resolver-follow-up-case-summary-copy';
import { ResolverFollowUpCaseSummaryView } from './resolver-follow-up-case-summary-view';
import { ResolverContextWithheld } from './resolver-context-withheld';

/**
 * Loads server-authorized case evidence for one resolver-owned follow-up.
 *
 * The opaque tenant, work-item, case, and run identity tuple is request context
 * only. Current ownership and authority are re-evaluated by the BFF for every
 * query before validated evidence reaches the view. Reopening the disclosure
 * revalidates even if an earlier cache entry has not yet been evicted.
 */
export function ResolverFollowUpCaseSummary({
  tenantId,
  signInHref,
  workItemId,
  caseId,
  runId,
  regionId,
  onBeforeRetry,
  claimId,
  ownershipRevision,
  onNotesAccessLost,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly regionId: string;
  /** Focuses the persistent capability control before this recovery body retires. */
  readonly onBeforeRetry: () => void;
  readonly claimId: string;
  readonly ownershipRevision: number;
  readonly onNotesAccessLost: () => void;
}): ReactElement {
  const result = useFreshResolverFollowUpCaseSummary({
    tenantId,
    workItemId,
    caseId,
    runId,
  });

  if (result.kind === 'pending') {
    return (
      <ResolverContextWithheld
        id={regionId}
        title="Loading case context…"
        description="The control plane is rechecking ownership and assembling the evidence used by the escalated run."
        live
      />
    );
  }

  // RTK Query retains previous data after a failed refetch; failure wins here.
  if (result.kind === 'failure') {
    const failure = result.failure;
    const copy = caseSummaryFailureCopy(failure);
    const action =
      failure.kind === 'authentication-required' ? (
        <Button asChild>
          <a href={signInHref}>Sign in again</a>
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => {
            onBeforeRetry();
            result.retry();
          }}
        >
          Try case context again
        </Button>
      ) : undefined;
    return (
      <ResolverContextWithheld
        id={regionId}
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  return (
    <ResolverFollowUpCaseSummaryView
      summary={result.summary}
      regionId={regionId}
      isFetching={false}
      inspectionActions={
        <div className="flex flex-wrap gap-2">
          <FollowUpNotesInspector
            query={{
              tenantId,
              workItemId,
              claimId,
              expectedOwnershipRevision: ownershipRevision,
            }}
            onAccessLost={onNotesAccessLost}
          />
          <FollowUpQuestionsInspector
            query={{
              tenantId,
              workItemId,
              caseId,
              claimId,
              expectedOwnershipRevision: ownershipRevision,
            }}
            onAccessLost={onNotesAccessLost}
          />
        </div>
      }
    />
  );
}
