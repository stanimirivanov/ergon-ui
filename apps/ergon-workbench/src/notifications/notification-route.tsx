import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router';
import {
  CurrentActorBoundary,
  usePrivateSessionFetch,
} from '@ergon/session-feature-web';
import { NotificationFeed } from '@ergon/notifications-feature-web';
import { FollowUpNotificationTarget } from '@ergon/follow-up-feature-web';
import { WorkbenchFrame } from '../app/workbench-frame';
import { createNotificationStore } from './notification-store';

/** Route owns navigation and ephemeral target selection; pointers never become authority or URL history. */
export function NotificationRoute(): ReactElement {
  const { tenantId } = useParams();
  if (
    tenantId === undefined ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(tenantId)
  )
    return (
      <WorkbenchFrame statusLabel="Invalid tenant">
        <p>A valid tenant address is required. No request was sent.</p>
      </WorkbenchFrame>
    );
  return <NotificationPage key={tenantId} tenantId={tenantId.toLowerCase()} />;
}

function NotificationPage({
  tenantId,
}: {
  readonly tenantId: string;
}): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const fetch = usePrivateSessionFetch();
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState(() => ({
    ...createNotificationStore(fetch),
    revision: 0,
    target: undefined as string | undefined,
  }));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    // React's development effect replay reacquires the scope before this microtask.
    // Real route departure retires handles and cached private content together.
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) scope.dispose();
      });
    };
  }, [scope]);
  function replace(target?: string): void {
    heading.current?.focus();
    // Unsubscribe before reset: resetting a still-mounted API can restart its session query.
    flushSync(() => setActive(false));
    scope.dispose();
    setScope({
      ...createNotificationStore(fetch),
      revision: scope.revision + 1,
      target,
    });
    setActive(true);
  }
  const signIn = `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${tenantId}` })}`;
  return (
    <WorkbenchFrame
      statusLabel="Historical notifications"
      navigation={
        <nav aria-label="Workbench views" className="px-6 py-4">
          <Link className="font-bold underline" to={`/tenants/${tenantId}`}>
            Back to follow-ups
          </Link>
        </nav>
      }
    >
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-black">
          Notifications
        </h1>
        {scope.target !== undefined && (
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="font-bold underline"
              onClick={() => replace()}
            >
              Back to notifications
            </button>
            <button
              type="button"
              className="font-bold underline"
              onClick={() => replace(scope.target)}
            >
              Recheck current access
            </button>
          </div>
        )}
        {active ? (
          <Provider key={scope.revision} store={scope.store}>
            <CurrentActorBoundary
              tenantId={tenantId}
              signInHrefForTenant={() => signIn}
              renderFrame={(_status, content) => <div>{content}</div>}
              renderVerified={({ actor }) =>
                scope.target === undefined ? (
                  <NotificationFeed
                    query={{
                      tenantId,
                      actorId: actor.actorId,
                      audience: 'resolver',
                    }}
                    signInHref={signIn}
                    onRecheck={() => replace()}
                    onOpen={(item) => replace(item.target.id)}
                  />
                ) : (
                  <FollowUpNotificationTarget
                    signInHref={signIn}
                    query={{
                      tenantId,
                      actorId: actor.actorId,
                      workItemId: scope.target,
                    }}
                  />
                )
              }
            />
          </Provider>
        ) : (
          <p role="status">Checking current access…</p>
        )}
      </section>
    </WorkbenchFrame>
  );
}
