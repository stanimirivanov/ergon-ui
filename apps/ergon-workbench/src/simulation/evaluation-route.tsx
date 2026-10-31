import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router';
import {
  CurrentActorBoundary,
  usePrivateSessionFetch,
} from '@ergon/session-feature-web';
import { EvaluationWorkspace } from '@ergon/evaluation-feature-web';
import { WorkbenchFrame } from '../app/workbench-frame';
import { createEvaluationStore } from './evaluation-store';

/** Route owns navigation and ephemeral target selection; pointers never become authority or URL history. */
export function EvaluationRoute(): ReactElement {
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
  return <EvaluationPage key={tenantId} tenantId={tenantId.toLowerCase()} />;
}

function EvaluationPage({
  tenantId,
}: {
  readonly tenantId: string;
}): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const fetch = usePrivateSessionFetch();
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState(() => ({
    ...createEvaluationStore(fetch),
    revision: 0,
    target: null as string | null,
    after: null as string | null,
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
  function replace(
    target: string | null = null,
    after: string | null = null,
  ): void {
    heading.current?.focus();
    // Unsubscribe before reset: resetting a still-mounted API can restart its session query.
    flushSync(() => setActive(false));
    scope.dispose();
    setScope({
      ...createEvaluationStore(fetch),
      revision: scope.revision + 1,
      target,
      after,
    });
    setActive(true);
  }
  const signIn = `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${tenantId}` })}`;
  return (
    <WorkbenchFrame
      statusLabel="Historical simulation evidence"
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
          Simulation Lab
        </h1>
        <p className="text-sm text-ink-muted">
          Historical simulation evidence. Passing checks do not grant promotion
          or execution authority.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            className="font-bold underline"
            onClick={() => replace(scope.target, scope.after)}
          >
            Recheck current access
          </button>
          {(scope.target !== null || scope.after !== null) && (
            <button
              type="button"
              className="font-bold underline"
              onClick={() => replace()}
            >
              Back to latest evaluations
            </button>
          )}
        </div>
        {active ? (
          <Provider key={scope.revision} store={scope.store}>
            <CurrentActorBoundary
              tenantId={tenantId}
              signInHrefForTenant={() => signIn}
              renderFrame={(_status, content) => <div>{content}</div>}
              renderVerified={({ actor }) => (
                <EvaluationWorkspace
                  query={{ tenantId, actorId: actor.actorId }}
                  reportId={scope.target}
                  after={scope.after}
                  signInHref={signIn}
                  onSelect={(id) => replace(id)}
                  onOlder={(after) => replace(null, after)}
                />
              )}
            />
          </Provider>
        ) : (
          <p role="status">Checking current access…</p>
        )}
      </section>
    </WorkbenchFrame>
  );
}
