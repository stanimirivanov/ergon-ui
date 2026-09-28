import { Button } from '@ergon/ui-web';
import { useSearchParams } from 'react-router';

import { HumanFollowUpInboxPage } from './human-follow-up-inbox-page';
import { InboxMessage, QueueFilter } from './human-follow-up-inbox-view';

const QUEUE_KEY_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

type QueueSelection =
  | { readonly valid: true; readonly queueKey?: string }
  | { readonly valid: false };

/**
 * Composes URL-owned queue filtering with the tenant-scoped inbox page.
 *
 * The tenant route is request context only; visibility and claim authority are
 * re-evaluated by the BFF.
 */
export function HumanFollowUpInbox({
  tenantId,
}: {
  readonly tenantId: string;
}) {
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
        <HumanFollowUpInboxPage
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

function decodeQueueKey(value: string | null): QueueSelection {
  if (value === null || value === '') {
    return { valid: true };
  }
  return QUEUE_KEY_PATTERN.test(value)
    ? { valid: true, queueKey: value }
    : { valid: false };
}
