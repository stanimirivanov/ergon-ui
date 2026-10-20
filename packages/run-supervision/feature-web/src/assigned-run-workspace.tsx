import { RunControlPanel } from './run-control-panel';
import { ThreePaneLayout, type WorkspaceRenderer } from '@ergon/ui-web';
import type { ReactElement, ReactNode } from 'react';

import { AssignedRunExecutionPane } from './assigned-run-execution-pane';
import { AssignedRunList } from './assigned-run-list';
import { AssignedRunOutcomePane } from './assigned-run-outcome-pane';
import { AssignedRunPresence } from './assigned-run-presence';
import { useAssignedRunWorkflow } from './use-assigned-run-workflow';
import { RunSupervisorHandover } from './run-supervisor-handover';
import { RunApprovalCard } from './run-approval-card';
import { RunProofFinalizationControl } from './run-proof-finalization-control';
import { RunCapabilityExecutionControl } from './run-capability-execution-control';
import { RunRetryControl } from './run-retry-control';
import { RunEscalationControl } from './run-escalation-control';
import { RunCancellationControl } from './run-cancellation-control';
import { RunExecutionHistoryInspector } from './run-execution-history-inspector';
import { RunInvocationHistoryInspector } from './run-invocation-history-inspector';
import { RunRetrySuccessorLookup } from './run-retry-successor-lookup';
import {
  assignedRunCommandFeedback,
  assignedRunCommandStatus,
  isRunCommandPending,
} from './assigned-run-command-presentation';

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
 * Backend-authorized commands are separately confirmed; inspection itself grants
 * neither an exclusive lease nor execution power.
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
  const isReadingAssigned =
    assigned.phase === 'pending' || workflow.isBlockingDisclosure;

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
    statusLabel: assignedRunCommandStatus(workflow),
    toolbar: (
      <AssignedRunPresence
        presence={presence}
        isReadingAssigned={isReadingAssigned}
        hasSelectedRun={selectedRunId !== null}
        onRecheck={handleAssignedRecheck}
        onClose={workflow.closeRun}
        isCommandPending={isRunCommandPending(workflow)}
        controlPanel={
          <RunControlPanel
            control={workflow.control}
            command={workflow.controlCommand}
            query={
              detail.phase === 'ready' &&
              detail.data.supervisionRevision !== undefined
                ? {
                    tenantId,
                    runId: detail.data.runId,
                    expectedSupervisionRevision:
                      detail.data.supervisionRevision,
                  }
                : null
            }
            heading={workflow.heading}
            onRecover={workflow.recoverControl}
            signInHref={signInHref}
          />
        }
        handoverControl={
          detail.phase === 'ready' && workflow.control.canCommand ? (
            <RunSupervisorHandover
              key={`${detail.data.runId}:${detail.data.supervisionRevision ?? 'unsupported'}`}
              tenantId={tenantId}
              run={detail.data}
              onConfirm={workflow.handover.submit}
              onAccessFailure={workflow.handover.rejectCandidates}
            />
          ) : undefined
        }
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
            isWithheld={workflow.isBlockingDisclosure}
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
            onInspectPredecessor={workflow.inspectPredecessor}
            {...(workflow.canReturnToAttempt
              ? { onReturnToAttempt: workflow.returnToAttempt }
              : {})}
            detail={detail}
            selectedRunId={selectedRunId}
            signInHref={signInHref}
            heading={workflow.heading}
            commandFeedback={assignedRunCommandFeedback(workflow, signInHref)}
            isBlockingDisclosure={workflow.isBlockingDisclosure}
            executionHistory={
              detail.phase === 'ready' ? (
                <RunExecutionHistoryInspector
                  key={`${tenantId}:${detail.data.runId}:${detail.data.supervisionRevision}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onAccessFailure={workflow.inspectionAccess.rejectHistoryRead}
                />
              ) : undefined
            }
            invocationHistory={
              detail.phase === 'ready' ? (
                <RunInvocationHistoryInspector
                  key={`${tenantId}:${detail.data.runId}:${detail.data.supervisionRevision}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onAccessFailure={
                    workflow.inspectionAccess.rejectInvocationRead
                  }
                />
              ) : undefined
            }
            retrySuccessor={
              detail.phase === 'ready' ? (
                <RunRetrySuccessorLookup
                  key={`${tenantId}:${detail.data.runId}:${detail.data.supervisionRevision}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onInspect={workflow.inspectSuccessor}
                  onAccessFailure={
                    workflow.inspectionAccess.rejectSuccessorRead
                  }
                />
              ) : undefined
            }
            retryControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunRetryControl
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.stateVersion}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.retryRun.submit}
                  onAccessFailure={workflow.retryRun.rejectReview}
                />
              ) : undefined
            }
            escalationControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunEscalationControl
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.stateVersion}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.escalation.submit}
                  onAccessFailure={workflow.escalation.rejectReview}
                />
              ) : undefined
            }
            cancellationControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunCancellationControl
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.stateVersion}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.cancellation.submit}
                  onAccessFailure={workflow.cancellation.rejectReview}
                />
              ) : undefined
            }
            executionControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunCapabilityExecutionControl
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.stateVersion}:${detail.data.approvalReview?.decision?.decisionId}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.execution.submit}
                  onAccessFailure={workflow.execution.rejectReview}
                />
              ) : undefined
            }
            approvalControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunApprovalCard
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.approvalReview?.request?.requestId ?? 'none'}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.approval.submit}
                />
              ) : undefined
            }
          />
        }
        trailing={
          <AssignedRunOutcomePane
            run={detail.phase === 'ready' ? detail.data : undefined}
            proofFinalizationControl={
              detail.phase === 'ready' && workflow.control.canCommand ? (
                <RunProofFinalizationControl
                  key={`${detail.data.runId}:${detail.data.supervisionRevision}:${detail.data.stateVersion}:${detail.data.outcomeVerification?.caseStreamVersion}:${detail.data.outcomeVerification?.evidence?.factId}`}
                  tenantId={tenantId}
                  run={detail.data}
                  onConfirm={workflow.proofFinalization.submit}
                />
              ) : undefined
            }
          />
        }
      />
    ),
  });
}
