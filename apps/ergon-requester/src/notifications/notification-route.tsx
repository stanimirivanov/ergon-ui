import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router';
import { CurrentActorBoundary } from '@ergon/session-feature-web';
import { NotificationFeed } from '@ergon/notifications-feature-web';
import { RequesterFrame } from '../app/requester-frame';
import { createNotificationStore } from './notification-store';

/** Tenant navigation only; existing supplied-case route performs its own fresh session and protected reads. */
export function RequesterNotificationRoute(): ReactElement {
  const { tenantId } = useParams();
  if (
    tenantId === undefined ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(tenantId)
  )
    return (
      <RequesterFrame>
        <p>A valid tenant address is required. No request was sent.</p>
      </RequesterFrame>
    );
  return <NotificationPage key={tenantId} tenantId={tenantId.toLowerCase()} />;
}
function NotificationPage({
  tenantId,
}: {
  readonly tenantId: string;
}): ReactElement {
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState(() => ({
    ...createNotificationStore(globalThis.fetch.bind(globalThis)),
    revision: 0,
  }));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    // Defer actual departure cleanup through StrictMode's effect replay.
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) scope.dispose();
      });
    };
  }, [scope]);
  function retire(): void {
    heading.current?.focus();
    // Reset only after subscribers leave; otherwise RTK may restart the retired session.
    flushSync(() => setActive(false));
    scope.dispose();
  }
  const signIn = `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${tenantId}` })}`;
  return (
    <RequesterFrame
      label="Historical notifications"
      navigation={
        <Link className="font-bold underline" to={`/tenants/${tenantId}`}>
          Back to your requests
        </Link>
      }
    >
      <h1 ref={heading} tabIndex={-1} className="mb-6 text-3xl font-black">
        Notifications
      </h1>
      {active ? (
        <Provider key={scope.revision} store={scope.store}>
          <CurrentActorBoundary
            tenantId={tenantId}
            signInHrefForTenant={() => signIn}
            renderFrame={(_status, content) => <div>{content}</div>}
            renderVerified={({ actor }) => (
              <NotificationFeed
                query={{
                  tenantId,
                  actorId: actor.actorId,
                  audience: 'requester',
                }}
                signInHref={signIn}
                onRecheck={() => {
                  retire();
                  setScope({
                    ...createNotificationStore(
                      globalThis.fetch.bind(globalThis),
                    ),
                    revision: scope.revision + 1,
                  });
                  setActive(true);
                }}
                onOpen={(item) => {
                  retire();
                  void navigate(
                    `/tenants/${tenantId}/cases/${encodeURIComponent(item.target.id)}`,
                  );
                }}
              />
            )}
          />
        </Provider>
      ) : (
        <p role="status">Checking current access…</p>
      )}
    </RequesterFrame>
  );
}
