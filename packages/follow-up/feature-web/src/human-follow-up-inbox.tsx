import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';

import { FollowUpMessage } from './follow-up-message';
import { HumanFollowUpInboxPage } from './human-follow-up-inbox-page';
import { QueueFilter } from './human-follow-up-inbox-view';

const QUEUE_KEY_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

type QueueSelection =
  | { readonly valid: true; readonly queueKey?: string }
  | { readonly valid: false };

/** Inputs supplied by the route-level composition boundary. */
export interface HumanFollowUpInboxProps {
  /** Request context only; the BFF remains authoritative for visibility. */
  readonly tenantId: string;
  /** Trusted same-origin navigation target supplied by the composition root. */
  readonly signInHref: string;
  /** Suspends its subscription and removes rows from the DOM during a Console detour. */
  readonly isActive?: boolean;
}

/**
 * Composes URL-owned queue filtering with the tenant-scoped inbox page.
 *
 * Visibility and claim authority are re-evaluated by the BFF. Authentication
 * failures navigate only to the trusted same-origin target supplied by the
 * composition root.
 */
export function HumanFollowUpInbox({
  tenantId,
  signInHref,
  isActive = true,
}: HumanFollowUpInboxProps): ReactElement {
  const [searchParameters, setSearchParameters] = useSearchParams();
  const queue = decodeQueueKey(searchParameters.get('queue'));

  function applyQueueFilter(queueKey: string | undefined): void {
    const next = new URLSearchParams(searchParameters);
    if (queueKey === undefined) {
      next.delete('queue');
    } else {
      next.set('queue', queueKey);
    }
    setSearchParameters(next);
  }

  return (
    <section
      aria-labelledby="inbox-heading"
      className="min-w-0 rounded-md border border-border bg-surface p-4 sm:p-5"
      hidden={!isActive}
    >
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
            Shared queue
          </p>
          <h2
            id="inbox-heading"
            className="mt-2 font-sans text-2xl font-bold tracking-tight text-ink"
          >
            Open follow-up work
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
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
        <HumanFollowUpInboxPage
          key={`${tenantId}:${queue.queueKey ?? 'all'}`}
          tenantId={tenantId}
          signInHref={signInHref}
          isActive={isActive}
          {...(queue.queueKey === undefined
            ? {}
            : { queueKey: queue.queueKey })}
        />
      ) : (
        <FollowUpMessage
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

function decodeQueueKey(value: string | null): QueueSelection {
  if (value === null || value === '') {
    return { valid: true };
  }
  return QUEUE_KEY_PATTERN.test(value)
    ? { valid: true, queueKey: value }
    : { valid: false };
}
