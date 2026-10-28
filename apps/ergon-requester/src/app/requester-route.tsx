import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { Link, useParams } from 'react-router';
import { createRequesterStore } from './requester-store';
import {
  CurrentActorBoundary,
  usePrivateSessionFetch,
} from '@ergon/session-feature-web';
import { RequesterCaseProgress } from '@ergon/requester-progress-feature-web';
import { RequesterCaseIntake } from '@ergon/requester-intake-feature-web';
import { RequesterFrame } from './requester-frame';
import { RequesterTenantHome } from './requester-tenant-home';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL is navigation context only. A fresh store lifetime prevents cached session reuse across supplied links. */
export function RequesterRoute({
  mode = 'case',
}: {
  readonly mode?: 'case' | 'intake';
}): ReactElement {
  const { tenantId, caseId } = useParams();
  if (
    tenantId === undefined ||
    !uuid.test(tenantId) ||
    (caseId !== undefined && !uuid.test(caseId))
  ) {
    return (
      <RequesterFrame>
        <h1 className="text-3xl font-bold">Use your supplied case link.</h1>
        <p className="mt-4">
          A complete tenant and case address is required. No session or case
          request was sent.
        </p>
      </RequesterFrame>
    );
  }
  return (
    <RequesterSession
      key={`${tenantId}/${mode}/${caseId ?? ''}`}
      mode={mode}
      tenantId={tenantId.toLowerCase()}
      {...(caseId === undefined ? {} : { caseId: caseId.toLowerCase() })}
    />
  );
}

function RequesterSession({
  tenantId,
  caseId,
  mode,
}: {
  readonly tenantId: string;
  readonly caseId?: string;
  readonly mode: 'case' | 'intake';
}): ReactElement {
  const label =
    mode === 'intake' ? 'Private request intake' : 'Private case progress';
  const fetch = usePrivateSessionFetch();
  const [scope] = useState(() => createRequesterStore(fetch));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    // Unsubscribe first; deferred disposal survives StrictMode effect replay and
    // runs before the root boundary's queued logout invocation.
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) scope.dispose();
      });
    };
  }, [scope]);
  return (
    <Provider store={scope.store}>
      <CurrentActorBoundary
        tenantId={tenantId}
        signInHrefForTenant={(id) =>
          `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${id}` })}`
        }
        renderFrame={(_status, content) => (
          <RequesterFrame label={label}>
            {content}
            <p className="mt-4 text-sm">
              Sign-in returns to this tenant. Then reopen your supplied case
              link or start a new request. Drafts and recovery are not retained.
            </p>
          </RequesterFrame>
        )}
        renderVerified={({ signInHref }) => (
          <RequesterFrame
            label={label}
            navigation={
              <Link
                className="font-bold underline"
                to={`/tenants/${tenantId}/notifications`}
              >
                Notifications
              </Link>
            }
          >
            {mode === 'intake' ? (
              <RequesterCaseIntake
                tenantId={tenantId}
                signInHref={signInHref}
                caseLink={(id) => (
                  <Link
                    className="font-bold underline"
                    to={`/tenants/${tenantId}/cases/${encodeURIComponent(id)}`}
                  >
                    Check current case progress
                  </Link>
                )}
              />
            ) : caseId === undefined ? (
              <RequesterTenantHome tenantId={tenantId} />
            ) : (
              <RequesterCaseProgress
                query={{ tenantId, caseId }}
                signInHref={signInHref}
              />
            )}
          </RequesterFrame>
        )}
      />
    </Provider>
  );
}
