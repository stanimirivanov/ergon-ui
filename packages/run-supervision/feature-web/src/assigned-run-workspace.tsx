import { ThreePaneLayout, type WorkspaceRenderer } from '@ergon/ui-web';
import type { ReactElement, ReactNode } from 'react';

import { AssignedRunExecutionPane } from './assigned-run-execution-pane';
import { AssignedRunList } from './assigned-run-list';
import { AssignedRunOutcomePane } from './assigned-run-outcome-pane';
import { AssignedRunPresence } from './assigned-run-presence';
import { useAssignedRunWorkflow } from './use-assigned-run-workflow';

interface AssignedRunWorkspaceProps {
  readonly tenantId: string;
  /** App-composed same-origin login URL; never derived from a problem response. */
  readonly signInHref: string;
  /** Verified actor display only, not evidence of supervisor authority. */
  readonly presence?: ReactNode;
  /** App-owned branding, navigation and viewport allocation around this view. */
  readonly renderWorkspace: WorkspaceRenderer;
}

/**
 * Inspects server-assigned runs beneath the app's verified-session boundary.
 * Selection and page cursors are local, never URL or persistent state. A fresh
 * discovery/read hides retained private records; failed discovery closes this
 * view's detail gate without discarding retry intent or affecting other readers.
 * Terminal detail may remain selected
 * after it leaves active discovery, but only a fresh exact-run read permits it.
 * This snapshot workspace grants neither an exclusive lease nor execution power.
 * Composition receives focused mode directly from the mounted workflow, not a
 * visibility callback. The app owns shell chrome; this feature owns domain panes
 * and the display-only presence/inspection toolbar.
 * Explicit rechecks and recovery focus the persistent execution heading before
 * their controls become unavailable; no background focus effect is added by
 * these interactions.
 */
export function AssignedRunWorkspace(
  props: AssignedRunWorkspaceProps,
): ReactElement {
  // A tenant switch retires all local selection and traversal intent together.
  return <TenantAssignedRunWorkspace key={props.tenantId} {...props} />;
}

function TenantAssignedRunWorkspace({
  tenantId,
  signInHref,
  presence,
  renderWorkspace,
}: AssignedRunWorkspaceProps): ReactElement {
  const workflow = useAssignedRunWorkflow(tenantId);
  const { assigned, detail, selectedRunId } = workflow;
  const isReadingAssigned = assigned.phase === 'pending';

  function handleAssignedRecheck(): void {
    // Discovery controls become disabled or disappear during revalidation.
    // The execution heading persists while their selected context is withheld.
    workflow.heading.current?.focus();
    assigned.recheck();
  }

  function handleAssignedReset(): void {
    // A first-page rejection need not change the selected run or detail phase,
    // so recovery cannot rely on the controller's selection focus effect.
    workflow.heading.current?.focus();
    workflow.resetTraversal();
  }

  return renderWorkspace({
    mode: 'focused',
    statusLabel: 'Assigned · read only',
    toolbar: (
      <AssignedRunPresence
        presence={presence}
        isReadingAssigned={isReadingAssigned}
        hasSelectedRun={selectedRunId !== null}
        onRecheck={handleAssignedRecheck}
        onClose={workflow.closeRun}
      />
    ),
    content: (
      <ThreePaneLayout
        leadingLabel="Assigned run discovery"
        primaryLabel="Run execution"
        trailingLabel="Run outcome"
        leading={
          <AssignedRunList
            page={assigned.phase === 'ready' ? assigned.data : undefined}
            selectedRunId={selectedRunId}
            isFetching={isReadingAssigned}
            isRecheck={assigned.phase === 'pending' && assigned.hasRetainedData}
            error={assigned.phase === 'failed' ? assigned.error : undefined}
            signInHref={signInHref}
            hasPrevious={workflow.hasPrevious}
            onSelect={workflow.selectRun}
            onRetry={handleAssignedRecheck}
            onResetPage={handleAssignedReset}
            onPrevious={workflow.previousPage}
            onNext={workflow.nextPage}
          />
        }
        primary={
          <AssignedRunExecutionPane
            detail={detail}
            selectedRunId={selectedRunId}
            signInHref={signInHref}
            heading={workflow.heading}
          />
        }
        trailing={
          <AssignedRunOutcomePane
            run={detail.phase === 'ready' ? detail.data : undefined}
          />
        }
      />
    ),
  });
}
