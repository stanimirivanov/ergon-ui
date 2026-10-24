import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
} from '@ergon/follow-up-data-access-web';
import type { HumanFollowUpWorkItem } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import type { FormEvent, ReactElement } from 'react';

import { FollowUpMessage } from './follow-up-message';
import { FollowUpPriorityLabel } from './follow-up-priority-label';
import { claimFailureCopy } from './human-follow-up-inbox-copy';

const openedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export type ClaimNotice =
  | {
      readonly kind: 'success';
      readonly workItemId: string;
      readonly ownershipRevision: number;
    }
  | {
      readonly kind: 'failure';
      readonly item: HumanFollowUpWorkItem;
      readonly command: HumanFollowUpClaimCommand;
      readonly failure: HumanFollowUpClaimFailure;
    };

interface HumanFollowUpPageViewProps {
  readonly items: readonly HumanFollowUpWorkItem[];
  readonly queueKey?: string;
  readonly isFetching: boolean;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly pendingWorkItemId: string | undefined;
  readonly claimNotice: ClaimNotice | undefined;
  readonly signInHref: string;
  readonly onClaim: (item: HumanFollowUpWorkItem) => Promise<void>;
  readonly onRetry: (
    item: HumanFollowUpWorkItem,
    command: HumanFollowUpClaimCommand,
  ) => Promise<void>;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

/** Renders one resolved inbox page without owning remote or navigation state. */
export function HumanFollowUpPageView({
  items,
  queueKey,
  isFetching,
  canGoBack,
  canGoNext,
  pendingWorkItemId,
  claimNotice,
  signInHref,
  onClaim,
  onRetry,
  onPrevious,
  onNext,
}: HumanFollowUpPageViewProps): ReactElement {
  return (
    <div className="pt-4" aria-busy={isFetching}>
      {claimNotice === undefined ? null : (
        <ClaimResultNotice
          notice={claimNotice}
          signInHref={signInHref}
          onRetry={onRetry}
        />
      )}

      {items.length === 0 ? (
        <FollowUpMessage
          title="No open work in this view."
          description={
            queueKey === undefined
              ? 'There are no visible unclaimed follow-ups. New work will appear here when it enters a queue you can resolve.'
              : `There are no visible unclaimed follow-ups in ${queueKey}. Clear or change the filter to inspect another queue.`
          }
        />
      ) : (
        <ol className="grid gap-4" aria-label="Open human follow-ups">
          {items.map((item) => (
            <li key={item.workItemId}>
              <WorkItem
                item={item}
                claimIsPending={pendingWorkItemId === item.workItemId}
                anotherClaimIsPending={pendingWorkItemId !== undefined}
                onClaim={onClaim}
              />
            </li>
          ))}
        </ol>
      )}

      <nav
        aria-label="Follow-up pages"
        className="mt-7 flex flex-wrap items-center justify-between gap-4"
      >
        <p className="text-sm text-ink-muted" aria-live="polite">
          {items.length === 0
            ? 'No rows on this page'
            : `${items.length} ${items.length === 1 ? 'row' : 'rows'} on this page`}
          {isFetching ? ' · Refreshing…' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="quiet"
            disabled={!canGoBack || isFetching}
            onClick={onPrevious}
          >
            Previous page
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={!canGoNext || isFetching}
            onClick={onNext}
          >
            Next page
          </Button>
        </div>
      </nav>
    </div>
  );
}

/** Applies an exact URL-owned queue key; an empty field restores all visible queues. */
export function QueueFilter({
  queueKey,
  onApply,
}: {
  readonly queueKey: string | null | undefined;
  readonly onApply: (queueKey: string | undefined) => void;
}): ReactElement {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('queue');
    const normalized = typeof value === 'string' ? value.trim() : '';
    onApply(normalized === '' ? undefined : normalized);
  }

  return (
    <form
      role="search"
      aria-label="Filter follow-up work"
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={submit}
    >
      <label className="flex min-w-0 grow flex-col gap-2 text-sm font-semibold">
        Queue key
        <input
          className="min-h-11 min-w-0 rounded-md border border-border bg-surface-strong px-3 text-base font-normal text-ink outline-none placeholder:text-ink-muted/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          defaultValue={queueKey ?? ''}
          name="queue"
          placeholder="All queues"
          autoComplete="off"
          maxLength={63}
          aria-describedby="queue-filter-hint"
        />
      </label>
      <Button type="submit" variant="quiet">
        Apply filter
      </Button>
      <span id="queue-filter-hint" className="sr-only">
        Leave blank to include every visible queue.
      </span>
    </form>
  );
}

function WorkItem({
  item,
  claimIsPending,
  anotherClaimIsPending,
  onClaim,
}: {
  readonly item: HumanFollowUpWorkItem;
  readonly claimIsPending: boolean;
  readonly anotherClaimIsPending: boolean;
  readonly onClaim: (item: HumanFollowUpWorkItem) => Promise<void>;
}) {
  const reason = humanizeReason(item.reason);
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface-strong p-4">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            {item.queueKey}
          </p>
          <h3 className="mt-2 text-lg font-bold text-ink">{reason}</h3>
          <FollowUpPriorityLabel value={item} />
          <dl
            className="mt-3 grid gap-2 text-xs"
            aria-label="Shared follow-up identifiers"
          >
            <div>
              <dt className="text-ink-muted">Case</dt>
              <dd className="break-all font-mono">{item.caseId}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Ownership revision</dt>
              <dd className="font-mono">{item.ownershipRevision}</dd>
            </div>
          </dl>
        </div>
        <div className="border-t border-border pt-3">
          <span className="inline-flex rounded-sm border border-highlight/50 bg-highlight/15 px-2 py-1 text-xs font-bold tracking-wide text-ink uppercase">
            Available to claim
          </span>
          <p className="mt-3 text-xs text-ink-muted">
            Opened{' '}
            <time dateTime={item.openedAt}>
              {formatOpenedAt(item.openedAt)}
            </time>
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={anotherClaimIsPending}
            aria-label={`Claim ${reason} follow-up`}
            onClick={() => void onClaim(item)}
          >
            {claimIsPending ? 'Claiming…' : 'Claim work'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function ClaimResultNotice({
  notice,
  signInHref,
  onRetry,
}: {
  readonly notice: ClaimNotice;
  readonly signInHref: string;
  readonly onRetry: (
    item: HumanFollowUpWorkItem,
    command: HumanFollowUpClaimCommand,
  ) => Promise<void>;
}) {
  if (notice.kind === 'success') {
    return (
      <div
        role="status"
        aria-label="Follow-up claimed"
        className="mb-4 rounded-md border border-accent/40 bg-accent/10 p-4"
      >
        <p className="font-bold text-ink">Follow-up claimed.</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Ownership was recorded for that claim.
        </p>
      </div>
    );
  }

  const copy = claimFailureCopy(notice.failure);
  const action =
    notice.failure.kind === 'authentication-required' ? (
      <Button asChild>
        <a href={signInHref}>Sign in again</a>
      </Button>
    ) : copy.canRetry ? (
      <Button
        type="button"
        variant="quiet"
        onClick={() => void onRetry(notice.item, notice.command)}
      >
        Try claim again
      </Button>
    ) : undefined;

  return (
    <div
      role="alert"
      aria-label={copy.title}
      className="mb-4 rounded-md border border-highlight/60 bg-highlight/10 p-4"
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

function formatOpenedAt(value: string): string {
  return `${openedAtFormatter.format(new Date(value))} UTC`;
}
