import type {
  HumanFollowUpFailure,
  ResolverOwnedHumanFollowUpCursor,
  ResolverOwnedHumanFollowUpQuery,
} from '@ergon/follow-up-application';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-domain';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import { browserSignInHref } from '../session/browser-session-navigation';
import { useResolverOwnedHumanFollowUpsQuery } from './human-follow-up-api';
import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

const PAGE_SIZE = 25;
const claimedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Renders active claims without inferring why the server returned an empty page. */
export function ResolverOwnedHumanFollowUps({
  tenantId,
}: {
  readonly tenantId: string;
}) {
  return (
    <section aria-labelledby="owned-work-heading" className="mt-12">
      <div className="border-b border-border pb-7">
        <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
          Your active work
        </p>
        <h2
          id="owned-work-heading"
          className="mt-3 font-display text-3xl tracking-[-0.025em] text-ink sm:text-4xl"
        >
          Claimed follow-ups
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
          Recover work you already own after navigation or reload. Current
          resolver authority is checked again whenever this list is requested.
        </p>
      </div>
      <OwnedWorkPage tenantId={tenantId} />
    </section>
  );
}

function OwnedWorkPage({ tenantId }: { readonly tenantId: string }) {
  const [position, setPosition] = useState<{
    readonly cursor?: ResolverOwnedHumanFollowUpCursor;
    readonly history: readonly (ResolverOwnedHumanFollowUpCursor | null)[];
  }>({ history: [] });
  const query: ResolverOwnedHumanFollowUpQuery = {
    tenantId,
    limit: PAGE_SIZE,
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  };
  const ownedWork = useResolverOwnedHumanFollowUpsQuery(query);

  if (
    ownedWork.isLoading ||
    (ownedWork.isFetching && ownedWork.data === undefined)
  ) {
    return (
      <OwnedWorkMessage
        title="Loading your active work…"
        description="The control plane is checking current ownership and resolver authority."
        live
      />
    );
  }

  if (ownedWork.data === undefined) {
    const failure = normalizeFailure(ownedWork.error);
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
          Return to first claimed-work page
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => ownedWork.refetch()}
        >
          Try again
        </Button>
      ) : undefined;
    return (
      <OwnedWorkMessage
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  const { items, nextCursor } = ownedWork.data;
  return (
    <div className="pt-7" aria-busy={ownedWork.isFetching}>
      {items.length === 0 ? (
        <OwnedWorkMessage
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
          {ownedWork.isFetching ? ' · Refreshing…' : ''}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="quiet"
            disabled={position.history.length === 0 || ownedWork.isFetching}
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
            Previous claimed-work page
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={nextCursor === null || ownedWork.isFetching}
            onClick={() => {
              if (nextCursor !== null) {
                setPosition((current) => ({
                  cursor: nextCursor,
                  history: [...current.history, current.cursor ?? null],
                }));
              }
            }}
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

function OwnedWorkMessage({
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

function normalizeFailure(error: unknown): HumanFollowUpFailure {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'authentication-required':
        return { kind: error.kind };
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

function failureCopy(failure: HumanFollowUpFailure) {
  switch (failure.kind) {
    case 'authentication-required':
      return {
        title: 'Your browser session has expired.',
        description: 'Sign in again before requesting your active work.',
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
        title: 'This identity cannot read active work.',
        description:
          'The control plane rejected the current tenant identity. No follow-up data is displayed.',
        canRetry: false,
      };
    case 'invalid-filter':
    case 'invalid-page':
      return {
        title: 'This claimed-work page is no longer valid.',
        description:
          'Return to the first page and retry the request with a fresh cursor.',
        canRetry: false,
      };
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
      return {
        title: 'Your active work is temporarily unavailable.',
        description:
          'The workbench could not load claimed follow-ups. Try again after the control plane is reachable.',
        canRetry: true,
      };
    case 'unexpected-response':
    case 'invalid-response':
    case 'request-cancelled':
      return {
        title: 'Your active work could not be loaded.',
        description:
          'The response was not safe to display. Try again or contact an operator.',
        canRetry: true,
      };
  }
}

function humanizeReason(reason: string) {
  const words = reason.toLowerCase().replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function formatClaimedAt(value: string) {
  return `${claimedAtFormatter.format(new Date(value))} UTC`;
}
