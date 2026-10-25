import { useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { useParams } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import { CurrentActorBoundary } from '@ergon/session-feature-web';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createProgressBffClient,
  progressApi,
} from '@ergon/requester-progress-data-access-web';
import { RequesterCaseProgress } from '@ergon/requester-progress-feature-web';
import { RequesterFrame } from './requester-frame';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL is navigation context only. A fresh store lifetime prevents cached session reuse across supplied links. */
export function RequesterRoute(): ReactElement {
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
      key={`${tenantId}/${caseId ?? ''}`}
      tenantId={tenantId.toLowerCase()}
      {...(caseId === undefined ? {} : { caseId: caseId.toLowerCase() })}
    />
  );
}

function RequesterSession({
  tenantId,
  caseId,
}: {
  readonly tenantId: string;
  readonly caseId?: string;
}): ReactElement {
  // A store belongs to one supplied-link lifetime; it never contains resolver APIs.
  const [store] = useState(() =>
    configureStore({
      reducer: {
        [currentActorApi.reducerPath]: currentActorApi.reducer,
        [progressApi.reducerPath]: progressApi.reducer,
      },
      middleware: (defaults) =>
        defaults({
          thunk: {
            extraArgument: {
              resolveCurrentActor: createCurrentActorBffAdapter({
                fetch: globalThis.fetch.bind(globalThis),
              }),
              progressClient: createProgressBffClient({
                fetch: globalThis.fetch.bind(globalThis),
              }),
            },
          },
        }).concat(currentActorApi.middleware, progressApi.middleware),
    }),
  );
  return (
    <Provider store={store}>
      <CurrentActorBoundary
        tenantId={tenantId}
        signInHrefForTenant={(id) =>
          `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${id}` })}`
        }
        renderFrame={(_status, content) => (
          <RequesterFrame>
            {content}
            <p className="mt-4 text-sm">
              Sign-in returns to this tenant. Then reopen your supplied case
              link; this app does not retain it.
            </p>
          </RequesterFrame>
        )}
        renderVerified={({ signInHref }) => (
          <RequesterFrame>
            {caseId === undefined ? (
              <section>
                <h1 className="text-3xl font-bold">
                  Your session is verified.
                </h1>
                <p className="mt-4">
                  Reopen your supplied case link to check progress. This
                  application does not list cases or create ownership.
                </p>
              </section>
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
