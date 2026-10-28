import type { ReactElement } from 'react';
import { Button } from '@ergon/ui-web';
import {
  notificationApi,
  notificationKey,
  normalizeNotificationFailure,
  type Notification,
  type NotificationFailure,
  type NotificationQuery,
} from '@ergon/notifications-data-access-web';

const titles = {
  INFORMATION_REQUESTED: 'Information requested',
  INFORMATION_ANSWERED: 'Requester answered',
  FOLLOW_UP_HANDED_OVER: 'Work handed over',
} as const;
const failures: Readonly<Record<NotificationFailure['kind'], string>> = {
  'authentication-required':
    'Your session must be renewed. No retained deliveries are shown.',
  forbidden:
    'Notification access is unavailable. Check your session and current role; this is not an empty feed.',
  unavailable:
    'Notifications are temporarily unavailable. Recheck to start a new session and feed check.',
  transport:
    'The notification request did not complete. Recheck when connectivity returns.',
  timeout: 'The notification check timed out. No older snapshot is displayed.',
  'request-cancelled':
    'The notification check was retired. Recheck to start again.',
  'invalid-response':
    'The notification response could not be validated. No retained deliveries are shown.',
  'unexpected-defect':
    'Notifications could not be checked. No diagnostic details or retained deliveries are shown.',
};

/**
 * RTK owns rows; the host owns a fresh verified-session/store lifetime for every recheck/open.
 * This read-only surface never acknowledges, polls, persists or treats historical coordinates as access.
 * Host callbacks withdraw this feature, focus its persistent page heading and retire owned requests before I/O.
 */
export function NotificationFeed({
  query,
  signInHref,
  onRecheck,
  onOpen,
}: {
  readonly query: NotificationQuery;
  readonly signInHref: string;
  readonly onRecheck: () => void;
  readonly onOpen: (item: Notification) => void;
}): ReactElement {
  const result = notificationApi.useRecentQuery(query, {
    refetchOnMountOrArgChange: true,
  });
  const pending =
    result.isUninitialized || result.isLoading || result.isFetching;
  const failed =
    result.isError || (!pending && result.currentData === undefined);
  const failure = normalizeNotificationFailure(result.error);
  return (
    <section
      aria-labelledby="recent-deliveries-heading"
      className="min-w-0 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recent-deliveries-heading" className="text-2xl font-bold">
          Recent deliveries
        </h2>
        <Button type="button" onClick={onRecheck} variant="quiet">
          Recheck notifications
        </Button>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-ink-muted">
        Historical delivery, not unread work or current access. Each target is
        checked independently when opened. Refreshing rechecks your session
        first.
      </p>
      {pending ? (
        <p role="status">Checking notifications…</p>
      ) : failed ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-surface p-5"
        >
          <p>{failures[failure.kind]}</p>
          {failure.kind === 'authentication-required' ? (
            <a
              className="mt-3 inline-block font-bold underline"
              href={signInHref}
            >
              Sign in again
            </a>
          ) : null}
        </div>
      ) : result.currentData !== undefined ? (
        <>
          {result.currentData.truncated ? (
            <p className="border-l-4 border-accent-strong pl-4 text-sm">
              Only the latest 50 deliveries are shown. Older entries are
              omitted; this is not a complete work queue.
            </p>
          ) : null}
          {result.currentData.items.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-6">
              No recent deliveries in this checked feed. This does not prove
              there is no outstanding work.
            </p>
          ) : (
            <ul className="grid min-w-0 gap-4 lg:grid-cols-2">
              {result.currentData.items.map((item) => (
                <li
                  key={notificationKey(item)}
                  className="min-w-0 rounded-lg border border-border bg-surface p-5"
                >
                  <h3 className="text-lg font-bold">{titles[item.kind]}</h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    Delivered{' '}
                    <time dateTime={item.deliveredAt}>
                      {new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(item.deliveredAt))}{' '}
                      UTC
                    </time>
                  </p>
                  <p className="my-3 break-all font-mono text-xs">
                    {item.target.kind === 'REQUESTER_CASE' ? 'Case' : 'Work'}{' '}
                    {item.target.id}
                  </p>
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => onOpen(item)}
                    aria-label={`Check current access to ${item.target.kind === 'REQUESTER_CASE' ? 'case' : 'work'} ${item.target.id}`}
                  >
                    Check current access
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
