import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router';
import {
  CurrentActorBoundary,
  usePrivateSessionFetch,
} from '@ergon/session-feature-web';
import {
  EvidenceWorkspace,
  EvidenceKnowledgeWorkspace,
} from '@ergon/evidence-feature-web';
import type {
  PendingEvidence,
  EvidenceCursor,
  KnowledgeTarget,
} from '@ergon/evidence-model';
import { WorkbenchFrame } from '../app/workbench-frame';
import { createEvidenceStore } from './evidence-store';

/** Route owns navigation and ephemeral target selection; pointers never become authority or URL history. */
export function EvidenceRoute(): ReactElement {
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
  return <EvidencePage key={tenantId} tenantId={tenantId.toLowerCase()} />;
}

function EvidencePage({
  tenantId,
}: {
  readonly tenantId: string;
}): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const fetch = usePrivateSessionFetch();
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState(() => ({
    ...createEvidenceStore(fetch),
    revision: 0,
    view: 'queue' as 'queue' | 'contradictions' | 'bundles',
    knowledge: null as KnowledgeTarget | null,
    target: null as PendingEvidence | null,
    cursor: null as EvidenceCursor | null,
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
    target: PendingEvidence | null = null,
    cursor: EvidenceCursor | null = null,
    view: 'queue' | 'contradictions' | 'bundles' = scope.view,
    knowledge: KnowledgeTarget | null = null,
  ): void {
    heading.current?.focus();
    // Unsubscribe before reset: resetting a still-mounted API can restart its session query.
    flushSync(() => setActive(false));
    scope.dispose();
    setScope({
      ...createEvidenceStore(fetch),
      revision: scope.revision + 1,
      target,
      cursor,
      view,
      knowledge,
    });
    setActive(true);
  }
  const signIn = `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${tenantId}` })}`;
  return (
    <WorkbenchFrame
      statusLabel="Documentary evidence"
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
          Evidence review
        </h1>
        <button
          type="button"
          className="font-bold underline"
          onClick={() => replace(null, null, 'queue')}
        >
          Refresh evidence queue
        </button>
        <div
          className="flex flex-wrap gap-4"
          role="group"
          aria-label="Evidence views"
        >
          <button
            type="button"
            className="font-bold underline"
            aria-pressed={scope.view === 'contradictions'}
            onClick={() => replace(null, null, 'contradictions')}
          >
            Review contradictions
          </button>
          <button
            type="button"
            className="font-bold underline"
            aria-pressed={scope.view === 'bundles'}
            onClick={() => replace(null, null, 'bundles')}
          >
            Inspect or publish bundles
          </button>
        </div>
        {scope.knowledge !== null && (
          <button
            type="button"
            className="font-bold underline"
            onClick={() => replace(null, null, scope.view, scope.knowledge)}
          >
            Recheck current documentary access
          </button>
        )}
        {scope.target !== null && (
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="font-bold underline"
              onClick={() => replace()}
            >
              Back to evidence queue
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
                scope.view !== 'queue' ? (
                  <EvidenceKnowledgeWorkspace
                    query={{ tenantId, actorId: actor.actorId }}
                    view={scope.view}
                    target={scope.knowledge}
                    signInHref={signIn}
                    onOpen={(target) =>
                      replace(
                        null,
                        null,
                        target.kind === 'bundle' ? 'bundles' : 'contradictions',
                        target,
                      )
                    }
                    onRecheck={() =>
                      replace(null, null, scope.view, scope.knowledge)
                    }
                  />
                ) : (
                  <EvidenceWorkspace
                    query={{ tenantId, actorId: actor.actorId }}
                    selection={scope.target}
                    cursor={scope.cursor}
                    signInHref={signIn}
                    onOpen={(proposal) => replace(proposal)}
                    onPage={(cursor) => replace(null, cursor)}
                    onRecheck={() => replace(scope.target, scope.cursor)}
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
