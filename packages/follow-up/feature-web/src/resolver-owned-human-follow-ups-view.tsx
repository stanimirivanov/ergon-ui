import type {
  HumanFollowUpReleaseCommand,
  HumanFollowUpReleaseFailure,
} from '@ergon/follow-up-data-access-web';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef } from 'react';

import { ConfirmedFollowUpRelease } from './confirmed-follow-up-release';
import { FollowUpMessage } from './follow-up-message';
import { releaseFailureCopy } from './resolver-owned-release-copy';

const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export type ReleaseNotice =
  | {
      readonly kind: 'success';
      readonly claimId: string;
      readonly workItemId: string;
      readonly ownershipRevision: number;
    }
  | {
      readonly kind: 'failure';
      readonly command: HumanFollowUpReleaseCommand;
      readonly failure: HumanFollowUpReleaseFailure;
    };

interface ResolverOwnedHumanFollowUpsListProps {
  readonly signInHref: string;
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  readonly releaseNotice: ReleaseNotice | undefined;
  readonly pendingClaimId: string | undefined;
  readonly consoleReleaseFocusId: string | null;
  readonly isFetching: boolean;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onRelease: (item: ResolverOwnedHumanFollowUpWork) => Promise<void>;
  readonly onOpenConsole: (item: ResolverOwnedHumanFollowUpWork) => void;
  readonly returnFocusToWorkItemId: string | null;
  readonly onMissingReturnFocus: () => void;
  readonly onRetryRelease: (
    command: HumanFollowUpReleaseCommand,
  ) => Promise<void>;
}

/** Renders one claimed-work page without owning its remote or cursor state. */
export function ResolverOwnedHumanFollowUpsList({
  signInHref,
  items,
  releaseNotice,
  pendingClaimId,
  consoleReleaseFocusId,
  isFetching,
  canGoBack,
  canGoNext,
  onPrevious,
  onNext,
  onRelease,
  onOpenConsole,
  returnFocusToWorkItemId,
  onMissingReturnFocus,
  onRetryRelease,
}: ResolverOwnedHumanFollowUpsListProps) {
  const pendingReleaseStatus = useRef<HTMLParagraphElement>(null);
  const isConsoleReleasePending =
    consoleReleaseFocusId !== null &&
    items.some(
      (item) =>
        item.workItem.workItemId === consoleReleaseFocusId &&
        item.claim.claimId === pendingClaimId,
    );
  const focusReleaseNotice =
    releaseNotice !== undefined &&
    consoleReleaseFocusId ===
      (releaseNotice.kind === 'success'
        ? releaseNotice.workItemId
        : releaseNotice.command.workItemId);

  useEffect(() => {
    if (isConsoleReleasePending) {
      pendingReleaseStatus.current?.focus();
    }
  }, [isConsoleReleasePending]);

  useEffect(() => {
    if (
      returnFocusToWorkItemId !== null &&
      !items.some(
        (item) => item.workItem.workItemId === returnFocusToWorkItemId,
      )
    ) {
      onMissingReturnFocus();
    }
  }, [items, returnFocusToWorkItemId, onMissingReturnFocus]);

  return (
    <div className="pt-7" aria-busy={isFetching}>
      {isConsoleReleasePending ? (
        <p
          ref={pendingReleaseStatus}
          role="status"
          aria-label="Releasing follow-up"
          tabIndex={-1}
          className="mb-5 rounded-md border border-border bg-surface p-4 text-sm text-ink"
        >
          Releasing this follow-up to its shared queue…
        </p>
      ) : null}
      {releaseNotice === undefined ? null : (
        <ReleaseResultNotice
          notice={releaseNotice}
          signInHref={signInHref}
          onRetry={onRetryRelease}
          focusOnMount={focusReleaseNotice}
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
                item={item}
                anotherReleaseIsPending={pendingClaimId !== undefined}
                releaseIsPending={pendingClaimId === item.claim.claimId}
                releaseWasRecorded={
                  releaseNotice?.kind === 'success' &&
                  releaseNotice.claimId === item.claim.claimId
                }
                onRelease={onRelease}
                onOpenConsole={onOpenConsole}
                shouldRestoreFocus={
                  returnFocusToWorkItemId === item.workItem.workItemId
                }
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
  item,
  anotherReleaseIsPending,
  releaseIsPending,
  releaseWasRecorded,
  onRelease,
  onOpenConsole,
  shouldRestoreFocus,
}: {
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly anotherReleaseIsPending: boolean;
  readonly releaseIsPending: boolean;
  readonly releaseWasRecorded: boolean;
  readonly onRelease: (item: ResolverOwnedHumanFollowUpWork) => Promise<void>;
  readonly onOpenConsole: (item: ResolverOwnedHumanFollowUpWork) => void;
  readonly shouldRestoreFocus: boolean;
}) {
  const openConsoleButton = useRef<HTMLButtonElement>(null);
  const reason = humanizeReason(item.workItem.reason);
  useEffect(() => {
    if (shouldRestoreFocus) {
      openConsoleButton.current?.focus();
    }
  }, [shouldRestoreFocus]);
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
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <Button
          ref={openConsoleButton}
          type="button"
          variant="quiet"
          disabled={releaseIsPending || releaseWasRecorded}
          onClick={() => onOpenConsole(item)}
        >
          Open resolver console
        </Button>
        <ConfirmedFollowUpRelease
          context="owned-card"
          reason={reason}
          caseId={item.workItem.caseId}
          queueKey={item.workItem.queueKey}
          isDisabled={anotherReleaseIsPending || releaseWasRecorded}
          {...(releaseIsPending
            ? { busyLabel: 'Releasing…' }
            : releaseWasRecorded
              ? { busyLabel: 'Refreshing…' }
              : {})}
          onConfirmRelease={() => void onRelease(item)}
        />
      </div>
    </article>
  );
}

function ReleaseResultNotice({
  notice,
  signInHref,
  onRetry,
  focusOnMount,
}: {
  readonly notice: ReleaseNotice;
  readonly signInHref: string;
  readonly onRetry: (command: HumanFollowUpReleaseCommand) => Promise<void>;
  readonly focusOnMount: boolean;
}) {
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) {
      noticeRef.current?.focus();
    }
  }, [focusOnMount, notice]);

  if (notice.kind === 'success') {
    return (
      <div
        ref={noticeRef}
        role="status"
        aria-label="Follow-up released"
        tabIndex={focusOnMount ? -1 : undefined}
        className="mb-5 rounded-2xl border border-accent/40 bg-accent/10 p-5"
      >
        <p className="font-bold text-ink">Follow-up released.</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          That claim was released back to its shared queue.
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
      ref={noticeRef}
      role="alert"
      aria-label={copy.title}
      tabIndex={focusOnMount ? -1 : undefined}
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
