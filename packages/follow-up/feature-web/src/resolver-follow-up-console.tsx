import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { ConfirmedFollowUpRelease } from './confirmed-follow-up-release';
import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Frames one locally selected, server-owned follow-up without creating a case route. */
export function ResolverFollowUpConsole({
  tenantId,
  signInHref,
  actorDetails,
  item,
  isReleasePending,
  onBack,
  onRecheckOwnership,
  onConfirmRelease,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  /** Verified session display only; this component cannot infer claim ownership from it. */
  readonly actorDetails: ReactNode;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly isReleasePending: boolean;
  readonly onBack: () => void;
  /** Must hide case context while current ownership is reread. */
  readonly onRecheckOwnership: () => void;
  readonly onConfirmRelease: () => void;
}): ReactElement {
  const regionId = `case-context-${item.workItem.workItemId}`;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3 border-r border-border pr-6">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md border border-accent font-bold text-accent-strong"
          >
            E
          </span>
          <span className="text-lg font-extrabold tracking-tight">Ergon</span>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="min-w-0 flex-1 text-xl font-bold tracking-tight sm:text-2xl"
        >
          Resolver Console
        </h1>
        <span className="rounded-md border border-highlight/60 bg-highlight/10 px-3 py-1 text-xs font-bold tracking-wide text-highlight uppercase">
          Escalated · claimed
        </span>
        <Button
          type="button"
          variant="quiet"
          size="compact"
          className="rounded-md"
          onClick={onBack}
        >
          Back to active work
        </Button>
      </header>

      <section
        aria-label="Current claim"
        className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface/90 px-4 py-3 sm:mx-4 lg:mx-5"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Current claim
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            In your active resolver work
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Ownership and authority are checked by the control plane for each
            action; this display is not a lease. Recheck before relying on
            details after a pause.
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

      <div className="px-3 pb-6 sm:px-4 lg:px-5">
        <ResolverFollowUpCaseSummary
          tenantId={tenantId}
          signInHref={signInHref}
          workItemId={item.workItem.workItemId}
          caseId={item.workItem.caseId}
          runId={item.workItem.runId}
          regionId={regionId}
        />
      </div>
    </div>
  );
}
