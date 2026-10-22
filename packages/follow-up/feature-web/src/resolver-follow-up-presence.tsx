import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode } from 'react';

import { ConfirmedFollowUpRelease } from './confirmed-follow-up-release';

const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Displays only a currently gated claim; actor display does not confer authority. */
export function ResolverFollowUpPresence({
  actorDetails,
  item,
  isReleasePending,
  onRecheckOwnership,
  onConfirmRelease,
}: {
  readonly actorDetails: ReactNode;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly isReleasePending: boolean;
  readonly onRecheckOwnership: () => void;
  readonly onConfirmRelease: () => void;
}): ReactElement {
  return (
    <section
      aria-label="Current claim"
      className="flex w-full min-w-0 flex-1 flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface/90 p-4 sm:w-auto"
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
          Current claim
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">
          In your active resolver work
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Ownership and authority are checked by the control plane for each
          action; this display is not a lease. Recheck before relying on details
          after a pause.
        </p>
      </div>
      {actorDetails}
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <div>
          <dt className="font-bold tracking-wide text-ink-muted uppercase">
            Claimed
          </dt>
          <dd className="mt-1 text-ink">
            <time dateTime={item.claim.claimedAt}>
              {claimedAtFormatter.format(new Date(item.claim.claimedAt))} UTC
            </time>
          </dd>
        </div>
        <div>
          <dt className="font-bold tracking-wide text-ink-muted uppercase">
            Ownership revision
          </dt>
          <dd className="mt-1 text-ink">{item.workItem.ownershipRevision}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="quiet"
          size="compact"
          disabled={isReleasePending}
          onClick={onRecheckOwnership}
        >
          Recheck current claim
        </Button>
        <ConfirmedFollowUpRelease
          context="resolver-console"
          reason={item.workItem.reason}
          caseId={item.workItem.caseId}
          queueKey={item.workItem.queueKey}
          isDisabled={isReleasePending}
          onConfirmRelease={onConfirmRelease}
        />
      </div>
    </section>
  );
}
