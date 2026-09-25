import { Button } from '@ergon/ui-web';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';

import { browserSignInHref } from '../session/browser-session-navigation';
import {
  useClaimHumanFollowUpMutation,
  useHumanFollowUpsQuery,
} from './human-follow-up-api';
import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpCursor,
  HumanFollowUpFailure,
  HumanFollowUpQuery,
  HumanFollowUpWorkItem,
} from './human-follow-up-client';

const PAGE_SIZE = 25;
const QUEUE_KEY_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;
const openedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

type ClaimNotice =
  | { readonly kind: 'success'; readonly item: HumanFollowUpWorkItem }
  | {
      readonly kind: 'failure';
      readonly item: HumanFollowUpWorkItem;
      readonly failure: HumanFollowUpClaimFailure;
    };

export function HumanFollowUpInbox({
  tenantId,
}: {
  readonly tenantId: string;
}) {
  const [searchParameters, setSearchParameters] = useSearchParams();
  const queue = decodeQueueKey(searchParameters.get('queue'));

  function applyQueueFilter(queueKey: string | undefined) {
    const next = new URLSearchParams(searchParameters);
    if (queueKey === undefined) {
      next.delete('queue');
    } else {
      next.set('queue', queueKey);
    }
    setSearchParameters(next);
  }

  return (
    <section aria-labelledby="inbox-heading" className="mt-12">
      <div className="flex flex-col gap-6 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
            Shared queue
          </p>
          <h2
            id="inbox-heading"
            className="mt-3 font-display text-3xl tracking-[-0.025em] text-ink sm:text-4xl"
          >
            Open follow-up work
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
            Oldest work appears first. Visibility follows your current resolver
            authority and is re-evaluated by the control plane.
          </p>
        </div>
        <QueueFilter
          key={queue.valid ? (queue.queueKey ?? 'all') : 'invalid'}
          queueKey={
            queue.valid ? queue.queueKey : searchParameters.get('queue')
          }
          onApply={applyQueueFilter}
        />
      </div>

      {queue.valid ? (
        <InboxPage
          key={queue.queueKey ?? 'all'}
          tenantId={tenantId}
          {...(queue.queueKey === undefined
            ? {}
            : { queueKey: queue.queueKey })}
        />
      ) : (
        <InboxMessage
          title="Queue filter is invalid."
          description="Use a lowercase queue key beginning with a letter. Hyphens and digits are allowed after the first character."
          action={
            <Button
              type="button"
              variant="quiet"
              onClick={() => applyQueueFilter(undefined)}
            >
              Clear filter
            </Button>
          }
        />
      )}
    </section>
  );
}

function QueueFilter({
  queueKey,
  onApply,
}: {
  readonly queueKey: string | null | undefined;
  readonly onApply: (queueKey: string | undefined) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
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

function InboxPage({
  tenantId,
  queueKey,
}: {
  readonly tenantId: string;
  readonly queueKey?: string;
}) {
  const [position, setPosition] = useState<{
    readonly cursor?: HumanFollowUpCursor;
    readonly history: readonly (HumanFollowUpCursor | null)[];
  }>({ history: [] });
  const [claimNotice, setClaimNotice] = useState<ClaimNotice>();
  const [claimHumanFollowUp, claimRequest] = useClaimHumanFollowUpMutation();
  const query: HumanFollowUpQuery = {
    tenantId,
    limit: PAGE_SIZE,
    ...(queueKey === undefined ? {} : { queueKey }),
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  };
  const followUps = useHumanFollowUpsQuery(query);

  async function claim(item: HumanFollowUpWorkItem) {
    setClaimNotice(undefined);
    const result = await claimHumanFollowUp({
      tenantId,
      workItemId: item.workItemId,
    });
    setClaimNotice(
      'data' in result
        ? { kind: 'success', item }
        : {
            kind: 'failure',
            item,
            failure: normalizeClaimFailure(result.error),
          },
    );
  }

  if (
    followUps.isLoading ||
    (followUps.isFetching && followUps.data === undefined)
  ) {
    return (
      <InboxMessage
        title="Loading follow-up work…"
        description="The workbench is requesting only the rows visible to your current authority."
        live
      />
    );
  }

  if (followUps.data === undefined) {
    const failure = normalizeFailure(followUps.error);
    const copy = failureCopy(failure);
    const action =
      failure.kind === 'authentication-required' ? (
        <Button asChild>
          <a href={browserSignInHref(tenantId)}>Sign in again</a>
        </Button>
      ) : failure.kind === 'invalid-page' ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => setPosition({ history: [] })}
        >
          Return to first page
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => followUps.refetch()}
        >
          Try again
        </Button>
      ) : undefined;
    return (
      <InboxMessage
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  const { items, nextCursor } = followUps.data;
  return (
    <div className="pt-7" aria-busy={followUps.isFetching}>
      {claimNotice === undefined ? null : (
        <ClaimResultNotice
          notice={claimNotice}
          tenantId={tenantId}
          onRetry={claim}
        />
      )}

      {items.length === 0 ? (
        <InboxMessage
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
                claimIsPending={
                  claimRequest.isLoading &&
                  claimRequest.originalArgs?.workItemId === item.workItemId
                }
                anotherClaimIsPending={claimRequest.isLoading}
                onClaim={claim}
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
          {followUps.isFetching ? ' · Refreshing…' : ''}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="quiet"
            disabled={position.history.length === 0 || followUps.isFetching}
            onClick={() =>
              setPosition((current) => {
                const previous = current.history[current.history.length - 1];
                const history = current.history.slice(0, -1);
                return previous === null || previous === undefined
                  ? { history }
                  : { cursor: previous, history };
              })
            }
          >
            Previous page
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={nextCursor === null || followUps.isFetching}
            onClick={() => {
              if (nextCursor !== null) {
                setPosition((current) => ({
                  cursor: nextCursor,
                  history: [...current.history, current.cursor ?? null],
                }));
              }
            }}
          >
            Next page
          </Button>
        </div>
      </nav>
    </div>
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
  tenantId,
  onRetry,
}: {
  readonly notice: ClaimNotice;
  readonly tenantId: string;
  readonly onRetry: (item: HumanFollowUpWorkItem) => Promise<void>;
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
        <a href={browserSignInHref(tenantId)}>Sign in again</a>
      </Button>
    ) : copy.canRetry ? (
      <Button
        type="button"
        variant="quiet"
        onClick={() => void onRetry(notice.item)}
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

function InboxMessage({
  title,
  description,
  action,
  live = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
  readonly live?: boolean;
}) {
  return (
    <div
      className="mt-7 rounded-2xl border border-dashed border-border bg-surface/70 p-7"
      aria-live={live ? 'polite' : undefined}
    >
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-3xl leading-7 text-ink-muted">{description}</p>
      {action === undefined ? null : <div className="mt-5">{action}</div>}
    </div>
  );
}

function decodeQueueKey(
  value: string | null,
):
  | { readonly valid: true; readonly queueKey?: string }
  | { readonly valid: false } {
  if (value === null || value === '') {
    return { valid: true };
  }
  return QUEUE_KEY_PATTERN.test(value)
    ? { valid: true, queueKey: value }
    : { valid: false };
}

function normalizeFailure(error: unknown): HumanFollowUpFailure {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'authentication-required':
        return 'signInPath' in error && error.signInPath === '/bff/login'
          ? { kind: error.kind, signInPath: error.signInPath }
          : { kind: 'invalid-response' };
      case 'authentication-unavailable':
      case 'actor-not-registered':
      case 'identity-rejected':
      case 'forbidden':
      case 'invalid-filter':
      case 'invalid-page':
      case 'timeout':
      case 'transport':
      case 'invalid-response':
      case 'request-cancelled':
        return { kind: error.kind };
      case 'service-unavailable':
      case 'unexpected-response':
        return {
          kind: error.kind,
          status:
            'status' in error && typeof error.status === 'number'
              ? error.status
              : 0,
        };
    }
  }
  return { kind: 'invalid-response' };
}

function normalizeClaimFailure(error: unknown): HumanFollowUpClaimFailure {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'authentication-required':
        return 'signInPath' in error && error.signInPath === '/bff/login'
          ? { kind: error.kind, signInPath: error.signInPath }
          : { kind: 'invalid-response' };
      case 'authentication-unavailable':
      case 'actor-not-registered':
      case 'identity-rejected':
      case 'resolver-authority-required':
      case 'csrf-rejected':
      case 'already-claimed':
      case 'not-found':
      case 'forbidden':
      case 'timeout':
      case 'transport':
      case 'invalid-response':
      case 'request-cancelled':
        return { kind: error.kind };
      case 'service-unavailable':
      case 'unexpected-response':
        return {
          kind: error.kind,
          status:
            'status' in error && typeof error.status === 'number'
              ? error.status
              : 0,
        };
    }
  }
  return { kind: 'invalid-response' };
}

function failureCopy(failure: HumanFollowUpFailure) {
  switch (failure.kind) {
    case 'authentication-required':
      return {
        title: 'Your browser session has expired.',
        description:
          'Sign in again before the workbench can request resolver data.',
        canRetry: false,
      };
    case 'authentication-unavailable':
      return {
        title: 'Browser sign-in is not configured.',
        description:
          'Ask an operator to configure the workbench authentication boundary.',
        canRetry: false,
      };
    case 'actor-not-registered':
      return {
        title: 'Your resolver access is no longer provisioned.',
        description:
          'Ask a tenant administrator to confirm your actor binding before continuing.',
        canRetry: false,
      };
    case 'identity-rejected':
    case 'forbidden':
      return {
        title: 'This identity cannot read the inbox.',
        description:
          'The control plane rejected the current tenant identity. No follow-up data is displayed.',
        canRetry: false,
      };
    case 'invalid-filter':
      return {
        title: 'The queue filter was rejected.',
        description:
          'Clear or correct the queue key before requesting follow-up work again.',
        canRetry: false,
      };
    case 'invalid-page':
      return {
        title: 'This inbox page is no longer valid.',
        description:
          'Return to the first page and retry the request with a fresh cursor.',
        canRetry: false,
      };
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
      return {
        title: 'The resolver inbox is temporarily unavailable.',
        description:
          'The workbench could not load visible follow-up work. Try again after the control plane is reachable.',
        canRetry: true,
      };
    case 'unexpected-response':
    case 'invalid-response':
    case 'request-cancelled':
      return {
        title: 'The resolver inbox could not be loaded.',
        description:
          'The response was not safe to display. Try again or contact an operator.',
        canRetry: true,
      };
  }
}

function claimFailureCopy(failure: HumanFollowUpClaimFailure) {
  switch (failure.kind) {
    case 'authentication-required':
      return {
        title: 'Your browser session has expired.',
        description: 'Sign in again before claiming resolver work.',
        canRetry: false,
      };
    case 'authentication-unavailable':
      return {
        title: 'Browser sign-in is not configured.',
        description:
          'Ask an operator to configure the workbench authentication boundary.',
        canRetry: false,
      };
    case 'actor-not-registered':
      return {
        title: 'Your resolver access is no longer provisioned.',
        description:
          'Ask a tenant administrator to confirm your actor binding before continuing.',
        canRetry: false,
      };
    case 'resolver-authority-required':
      return {
        title: 'Current resolver authority is required.',
        description:
          'Your authority changed before ownership could be recorded. The work was not claimed.',
        canRetry: false,
      };
    case 'identity-rejected':
    case 'forbidden':
      return {
        title: 'This identity cannot claim follow-up work.',
        description:
          'The control plane rejected the current tenant identity. No ownership was recorded.',
        canRetry: false,
      };
    case 'csrf-rejected':
      return {
        title: 'The browser security check expired.',
        description:
          'Retry to obtain a fresh session-bound security token before claiming this work.',
        canRetry: true,
      };
    case 'already-claimed':
      return {
        title: 'Another resolver claimed this work.',
        description:
          'The shared inbox is refreshing so the stale item can be removed.',
        canRetry: false,
      };
    case 'not-found':
      return {
        title: 'This follow-up is no longer available.',
        description:
          'The shared inbox is refreshing so the stale item can be removed.',
        canRetry: false,
      };
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
      return {
        title: 'The claim result is not yet known.',
        description:
          'Retrying is safe: if the first request succeeded, the control plane returns your existing claim.',
        canRetry: true,
      };
    case 'unexpected-response':
    case 'invalid-response':
    case 'request-cancelled':
      return {
        title: 'The claim result could not be verified.',
        description:
          'The response was not safe to use. Retrying is safe because your claim is idempotent.',
        canRetry: true,
      };
  }
}

function humanizeReason(reason: string) {
  const words = reason.toLowerCase().replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function formatOpenedAt(value: string) {
  return `${openedAtFormatter.format(new Date(value))} UTC`;
}
