import type {
  HumanFollowUpReleaseCommand,
  HumanFollowUpReleaseFailure,
} from '@ergon/follow-up-data-access-web';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import { FollowUpMessage } from './follow-up-message';
import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';
import { releaseFailureCopy } from './resolver-owned-release-copy';

const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export type ReleaseNotice =
  | { readonly kind: 'success'; readonly claimId: string }
  | {
      readonly kind: 'failure';
      readonly command: HumanFollowUpReleaseCommand;
      readonly failure: HumanFollowUpReleaseFailure;
    };

interface ResolverOwnedHumanFollowUpsListProps {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  readonly releaseNotice: ReleaseNotice | undefined;
  readonly pendingClaimId: string | undefined;
  readonly isFetching: boolean;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onRelease: (item: ResolverOwnedHumanFollowUpWork) => Promise<void>;
  readonly onRetryRelease: (
    command: HumanFollowUpReleaseCommand,
  ) => Promise<void>;
}

/** Renders one claimed-work page without owning its remote or cursor state. */
export function ResolverOwnedHumanFollowUpsList({
  tenantId,
  signInHref,
  items,
  releaseNotice,
  pendingClaimId,
  isFetching,
  canGoBack,
  canGoNext,
  onPrevious,
  onNext,
  onRelease,
  onRetryRelease,
}: ResolverOwnedHumanFollowUpsListProps) {
  return (
    <div className="pt-7" aria-busy={isFetching}>
      {releaseNotice === undefined ? null : (
        <ReleaseResultNotice
          notice={releaseNotice}
          signInHref={signInHref}
          onRetry={onRetryRelease}
        />
      )}
      {items.length === 0 ? (
        <FollowUpMessage
          title="No active claimed work in this view."
          description="Claimed follow-ups appear here while they remain open and visible under your current authority."
        />
      ) : (
        <ol className="grid gap-4" aria-label="Your active human follow-ups">
          {items.map((item) => (
            <li key={item.claim.claimId}>
              <OwnedWorkItem
                tenantId={tenantId}
                signInHref={signInHref}
                item={item}
                anotherReleaseIsPending={pendingClaimId !== undefined}
                releaseIsPending={pendingClaimId === item.claim.claimId}
                releaseWasRecorded={
                  releaseNotice?.kind === 'success' &&
                  releaseNotice.claimId === item.claim.claimId
                }
                onRelease={onRelease}
              />
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
  signInHref,
  item,
  anotherReleaseIsPending,
  releaseIsPending,
  releaseWasRecorded,
  onRelease,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly anotherReleaseIsPending: boolean;
  readonly releaseIsPending: boolean;
  readonly releaseWasRecorded: boolean;
  readonly onRelease: (item: ResolverOwnedHumanFollowUpWork) => Promise<void>;
}) {
  const [isContextOpen, setContextOpen] = useState(false);
  const [isConfirmingRelease, setConfirmingRelease] = useState(false);
  const reason = humanizeReason(item.workItem.reason);
  const regionId = `case-context-${item.workItem.workItemId}`;
  function confirmRelease(): void {
    // A released claim must not leave previously authorized case evidence open
    // while the owned-work cache is refreshing.
    setContextOpen(false);
    setConfirmingRelease(false);
    void onRelease(item);
  }
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
          disabled={releaseIsPending || releaseWasRecorded}
          onClick={() => setContextOpen((current) => !current)}
        >
          {isContextOpen ? 'Hide case context' : 'Review case context'}
        </Button>
        {isConfirmingRelease ? (
          <div
            className="mt-4 rounded-xl border border-highlight/50 bg-highlight/10 p-4"
            role="group"
            aria-label={`Release ${reason} follow-up`}
          >
            <p className="text-sm text-ink">
              Releasing returns this work to its original shared queue. It does
              not complete the case.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={anotherReleaseIsPending || releaseWasRecorded}
                onClick={confirmRelease}
              >
                Confirm release
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={() => setConfirmingRelease(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="quiet"
            className="ml-3"
            disabled={anotherReleaseIsPending || releaseWasRecorded}
            aria-label={`Release ${reason} follow-up`}
            onClick={() => setConfirmingRelease(true)}
          >
            {releaseIsPending
              ? 'Releasing…'
              : releaseWasRecorded
                ? 'Refreshing…'
                : 'Release work'}
          </Button>
        )}
      </div>
      {isContextOpen ? (
        <ResolverFollowUpCaseSummary
          tenantId={tenantId}
          signInHref={signInHref}
          workItemId={item.workItem.workItemId}
          caseId={item.workItem.caseId}
          runId={item.workItem.runId}
          regionId={regionId}
        />
      ) : null}
    </article>
  );
}

function ReleaseResultNotice({
  notice,
  signInHref,
  onRetry,
}: {
  readonly notice: ReleaseNotice;
  readonly signInHref: string;
  readonly onRetry: (command: HumanFollowUpReleaseCommand) => Promise<void>;
}) {
  if (notice.kind === 'success') {
    return (
      <div
        role="status"
        aria-label="Follow-up released"
        className="mb-5 rounded-2xl border border-accent/40 bg-accent/10 p-5"
      >
        <p className="font-bold text-ink">Follow-up released.</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          The shared inbox and your active work are refreshing.
        </p>
      </div>
    );
  }

  const copy = releaseFailureCopy(notice.failure);
  const action =
    notice.failure.kind === 'authentication-required' ? (
      <Button asChild>
        <a href={signInHref}>Sign in again</a>
      </Button>
    ) : copy.canRetry ? (
      <Button
        type="button"
        variant="quiet"
        onClick={() => void onRetry(notice.command)}
      >
        Try release again
      </Button>
    ) : undefined;
  return (
    <div
      role="alert"
      aria-label={copy.title}
      className="mb-5 rounded-2xl border border-highlight/60 bg-highlight/10 p-5"
    >
      <p className="font-bold text-ink">{copy.title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        {copy.description}
      </p>
      {action === undefined ? null : <div className="mt-4">{action}</div>}
    </div>
  );
}

function humanizeReason(reason: string): string {
  const words = reason.toLowerCase().replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function formatClaimedAt(value: string): string {
  return `${claimedAtFormatter.format(new Date(value))} UTC`;
}
