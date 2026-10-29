import { HumanFollowUpWorkspace } from '@ergon/follow-up-feature-web';
import { AssignedRunWorkspace } from '@ergon/run-supervision-feature-web';
import {
  VerifiedActorBadge,
  VerifiedActorDetails,
  type VerifiedSession,
} from '@ergon/session-feature-web';
import type { ReactElement } from 'react';
import { Button, type WorkspaceView } from '@ergon/ui-web';
import { Link, useSearchParams } from 'react-router';

import { WorkbenchFrame } from './workbench-frame';

/**
 * Composes independent resolver capabilities after server session verification.
 * Only the non-sensitive view name is shareable; switching views unmounts the
 * previous feature and discards its private run or claim selection.
 */
export function VerifiedWorkbench({
  actor,
  tenantId,
  signInHref,
}: VerifiedSession): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const runsSelected = searchParams.get('view') === 'runs';
  const runsSearch = new URLSearchParams(searchParams);
  runsSearch.set('view', 'runs');

  function returnToFollowUps(): void {
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.delete('view');
    setSearchParams(nextSearch);
  }

  function renderWorkspace(view: WorkspaceView): ReactElement {
    const navigation = runsSelected ? (
      <Button
        type="button"
        variant="quiet"
        size="compact"
        onClick={returnToFollowUps}
      >
        Back to follow-ups
      </Button>
    ) : view.mode === 'standard' ? (
      <WorkbenchViewNavigation
        tenantId={tenantId}
        runsSearch={runsSearch.toString()}
      />
    ) : undefined;
    return (
      <WorkbenchFrame
        mode={view.mode}
        statusLabel={view.statusLabel}
        toolbar={view.toolbar}
        navigation={navigation}
      >
        {view.content}
      </WorkbenchFrame>
    );
  }

  if (runsSelected) {
    return (
      <AssignedRunWorkspace
        tenantId={tenantId}
        signInHref={signInHref}
        presence={<VerifiedActorBadge actor={actor} />}
        renderWorkspace={renderWorkspace}
      />
    );
  }

  return (
    <HumanFollowUpWorkspace
      tenantId={tenantId}
      signInHref={signInHref}
      actorDetails={<VerifiedActorDetails actor={actor} />}
      consoleActorDetails={<VerifiedActorBadge actor={actor} />}
      renderWorkspace={renderWorkspace}
    />
  );
}

function WorkbenchViewNavigation({
  runsSearch,
  tenantId,
}: {
  readonly runsSearch: string;
  readonly tenantId: string;
}): ReactElement {
  return (
    <nav
      className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 border-t border-border px-6 py-4 text-sm lg:px-10"
      aria-label="Workbench views"
    >
      <span className="font-bold" aria-current="page">
        Human follow-ups
      </span>
      <Link
        to={`/tenants/${tenantId}/evidence`}
        className="font-bold underline"
      >
        Evidence review
      </Link>
      <Link
        to={`/tenants/${tenantId}/notifications`}
        className="font-bold underline"
      >
        Notifications
      </Link>
      <Link
        to={{ search: `?${runsSearch}` }}
        className="rounded-md border border-border bg-surface px-4 py-2 font-semibold text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong"
      >
        Assigned runs
      </Link>
    </nav>
  );
}
