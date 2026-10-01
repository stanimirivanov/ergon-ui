import { useResolverFollowUpCaseSummaryQuery } from '@ergon/follow-up-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactNode } from 'react';

import { normalizeFollowUpCaseSummaryFailure } from './follow-up-failure-normalization';
import { caseSummaryFailureCopy } from './resolver-follow-up-case-summary-copy';
import { ResolverFollowUpCaseSummaryView } from './resolver-follow-up-case-summary-view';

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
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly regionId: string;
}) {
  const result = useResolverFollowUpCaseSummaryQuery(
    { tenantId, workItemId, caseId, runId },
    { refetchOnMountOrArgChange: true },
  );

  if (result.isLoading || result.isFetching) {
    return (
      <CaseContextMessage
        id={regionId}
        title="Loading case context…"
        description="The control plane is rechecking ownership and assembling the evidence used by the escalated run."
        live
      />
    );
  }

  // RTK Query retains previous data after a failed refetch; failure wins here.
  if (result.isError || result.data === undefined) {
    const failure = normalizeFollowUpCaseSummaryFailure(result.error);
    const copy = caseSummaryFailureCopy(failure);
    const action =
      failure.kind === 'authentication-required' ? (
        <Button asChild>
          <a href={signInHref}>Sign in again</a>
        </Button>
      ) : copy.canRetry ? (
        <Button type="button" variant="quiet" onClick={() => result.refetch()}>
          Try case context again
        </Button>
      ) : undefined;
    return (
      <CaseContextMessage
        id={regionId}
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  return (
    <ResolverFollowUpCaseSummaryView
      summary={result.data}
      regionId={regionId}
      isFetching={result.isFetching}
    />
  );
}

function CaseContextMessage({
  id,
  title,
  description,
  action,
  live = false,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly live?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="mt-5 border-t border-border pt-5"
      aria-live={live ? 'polite' : undefined}
    >
      <h4 id={`${id}-heading`} className="font-bold text-ink">
        {title}
      </h4>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action === undefined ? null : <div className="mt-4">{action}</div>}
    </section>
  );
}
