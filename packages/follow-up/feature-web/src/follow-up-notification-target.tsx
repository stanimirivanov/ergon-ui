import type { ReactElement } from 'react';
import {
  followUpNotificationTargetApi,
  normalizeNotificationTargetFailure,
  type FollowUpNotificationTargetQuery,
} from '@ergon/follow-up-data-access-web';
import { ResolverFollowUpCaseSummaryView } from './resolver-follow-up-case-summary-view';
import { caseSummaryFailureCopy } from './resolver-follow-up-case-summary-copy';

/**
 * Fresh host-owned session/store lifetime is required. This is a read-only current-owner context,
 * not a queue selection, claim, authorization or receipt. Retained data is hidden during any failed/pending check.
 */
export function FollowUpNotificationTarget({
  query,
  signInHref,
}: {
  readonly query: FollowUpNotificationTargetQuery;
  readonly signInHref: string;
}): ReactElement {
  const result = followUpNotificationTargetApi.useCurrentQuery(query, {
    refetchOnMountOrArgChange: true,
  });
  if (result.isLoading || result.isFetching || result.isUninitialized)
    return <p role="status">Checking current work access…</p>;
  if (result.isError || result.currentData === undefined) {
    const failure = normalizeNotificationTargetFailure(result.error);
    const copy = caseSummaryFailureCopy(failure);
    return (
      <section
        role="alert"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h2 className="text-xl font-bold">{copy.title}</h2>
        <p className="mt-3">{copy.description}</p>
        {failure.kind === 'authentication-required' && (
          <a
            className="mt-3 inline-block font-bold underline"
            href={signInHref}
          >
            Sign in again
          </a>
        )}
        <p className="mt-3 text-sm text-ink-muted">
          A historical delivery cannot restore ownership. Recheck or return to
          notifications; no work was claimed.
        </p>
      </section>
    );
  }
  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm text-ink-muted">
        Independently checked, read-only case context. Return to owned work to
        use reviewed resolver controls.
      </p>
      <ResolverFollowUpCaseSummaryView
        summary={result.currentData}
        regionId="notification-current-context"
        isFetching={false}
      />
    </div>
  );
}
