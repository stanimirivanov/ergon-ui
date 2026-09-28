import type { ResolverOwnedHumanFollowUpWork } from '@ergon/domain-follow-up';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import { FollowUpMessage } from './follow-up-message';
import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

interface ResolverOwnedHumanFollowUpsListProps {
  readonly tenantId: string;
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  readonly isFetching: boolean;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

/** Renders one claimed-work page without owning its remote or cursor state. */
export function ResolverOwnedHumanFollowUpsList({
  tenantId,
  items,
  isFetching,
  canGoBack,
  canGoNext,
  onPrevious,
  onNext,
}: ResolverOwnedHumanFollowUpsListProps) {
  return (
    <div className="pt-7" aria-busy={isFetching}>
      {items.length === 0 ? (
        <FollowUpMessage
          title="No active claimed work in this view."
          description="Claimed follow-ups appear here while they remain open and visible under your current authority."
        />
      ) : (
        <ol className="grid gap-4" aria-label="Your active human follow-ups">
          {items.map((item) => (
            <li key={item.claim.claimId}>
              <OwnedWorkItem tenantId={tenantId} item={item} />
            </li>
          ))}
        </ol>
      )}

      <nav
        aria-label="Claimed follow-up pages"
        className="mt-7 flex flex-wrap items-center justify-between gap-4"
      >
        <p className="text-sm text-ink-muted" aria-live="polite">
          {items.length === 0
            ? 'No rows on this page'
            : `${items.length} ${items.length === 1 ? 'row' : 'rows'} on this page`}
          {isFetching ? ' · Refreshing…' : ''}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="quiet"
            disabled={!canGoBack || isFetching}
            onClick={onPrevious}
          >
            Previous claimed-work page
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={!canGoNext || isFetching}
            onClick={onNext}
          >
            Next claimed-work page
          </Button>
        </div>
      </nav>
    </div>
  );
}

function OwnedWorkItem({
  tenantId,
  item,
}: {
  readonly tenantId: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
}) {
  const [isContextOpen, setContextOpen] = useState(false);
  const reason = humanizeReason(item.workItem.reason);
  const regionId = `case-context-${item.workItem.workItemId}`;
  return (
    <article className="rounded-2xl border border-accent/35 bg-surface p-5 shadow-[0_12px_35px_rgb(24_32_25_/_6%)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            {item.workItem.queueKey}
          </p>
          <h3 className="mt-2 text-lg font-bold text-ink">{reason}</h3>
          <p className="mt-3 text-sm text-ink-muted">
            Case{' '}
            <span className="break-all font-mono text-xs text-ink">
              {item.workItem.caseId}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold tracking-wide text-accent-strong uppercase">
            Claimed
          </span>
          <p className="mt-3 text-xs text-ink-muted">
            Claimed{' '}
            <time dateTime={item.claim.claimedAt}>
              {formatClaimedAt(item.claim.claimedAt)}
            </time>
          </p>
        </div>
      </div>
      <div className="mt-5">
        <Button
          type="button"
          variant="quiet"
          aria-expanded={isContextOpen}
          aria-controls={regionId}
          onClick={() => setContextOpen((current) => !current)}
        >
          {isContextOpen ? 'Hide case context' : 'Review case context'}
        </Button>
      </div>
      {isContextOpen ? (
        <ResolverFollowUpCaseSummary
          tenantId={tenantId}
          workItemId={item.workItem.workItemId}
          caseId={item.workItem.caseId}
          runId={item.workItem.runId}
          regionId={regionId}
        />
      ) : null}
    </article>
  );
}

function humanizeReason(reason: string): string {
  const words = reason.toLowerCase().replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function formatClaimedAt(value: string): string {
  return `${claimedAtFormatter.format(new Date(value))} UTC`;
}
