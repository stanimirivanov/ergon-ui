import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
} from '@ergon/follow-up-data-access-web';
import type { HumanFollowUpWorkItem } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import type { FormEvent } from 'react';

import { FollowUpMessage } from './follow-up-message';
import { claimFailureCopy } from './human-follow-up-inbox-copy';

const openedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export type ClaimNotice =
  | { readonly kind: 'success' }
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
}: HumanFollowUpPageViewProps) {
  return (
    <div className="pt-7" aria-busy={isFetching}>
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
        <div className="flex gap-3">
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

export function QueueFilter({
  queueKey,
  onApply,
}: {
  readonly queueKey: string | null | undefined;
  readonly onApply: (queueKey: string | undefined) => void;
}) {
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
      className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-end lg:w-auto"
      onSubmit={submit}
    >
      <label className="flex min-w-64 grow flex-col gap-2 text-sm font-semibold">
        Queue key
        <input
          className="min-h-11 rounded-xl border border-border bg-surface-strong px-4 text-base font-normal text-ink outline-none placeholder:text-ink-muted/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_35px_rgb(24_32_25_/_6%)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            {item.queueKey}
          </p>
          <h3 className="mt-2 text-lg font-bold text-ink">{reason}</h3>
          <p className="mt-3 text-sm text-ink-muted">
            Case{' '}
            <span className="break-all font-mono text-xs text-ink">
              {item.caseId}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <span className="inline-flex rounded-full border border-highlight/50 bg-highlight/15 px-3 py-1 text-xs font-bold tracking-wide text-ink uppercase">
            Open
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
        className="mb-5 rounded-2xl border border-accent/40 bg-accent/10 p-5"
      >
        <p className="font-bold text-ink">Follow-up claimed.</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Ownership was recorded. The shared inbox is refreshing now.
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

function formatOpenedAt(value: string): string {
  return `${openedAtFormatter.format(new Date(value))} UTC`;
}
