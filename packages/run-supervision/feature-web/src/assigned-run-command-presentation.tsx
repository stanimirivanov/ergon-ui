import type { ReactElement } from 'react';
import type { AssignedRunWorkflow } from './use-assigned-run-workflow';
import { AssignedRunHandoverFeedback } from './assigned-run-handover-feedback';
import { RunApprovalFeedback } from './run-approval-feedback';
import { RunProofFinalizationFeedback } from './run-proof-finalization-feedback';
import { RunCapabilityExecutionFeedback } from './run-capability-execution-feedback';
import { assignedRunSnapshotStatus } from './run-supervision-copy';

/** Active barriers outrank every historical receipt, including read failures that have no submitted command. No new state owner is introduced. */
export function assignedRunCommandFeedback(
  workflow: AssignedRunWorkflow,
  signInHref: string,
): ReactElement | undefined {
  const { execution, proofFinalization: proof, approval, handover } = workflow;
  const feedback = [
    {
      blocking: execution.isBlockingDisclosure,
      content:
        execution.state.phase === 'idle' ? null : (
          <RunCapabilityExecutionFeedback
            state={execution.state}
            signInHref={signInHref}
            onRetry={execution.retry}
            onRecheck={workflow.recoverExecution}
            onLeave={workflow.closeRun}
          />
        ),
    },
    {
      blocking: proof.isBlockingDisclosure,
      content:
        proof.state.phase === 'idle' ? null : (
          <RunProofFinalizationFeedback
            state={proof.state}
            signInHref={signInHref}
            onRetry={proof.retry}
            onRecheck={workflow.recoverProofFinalization}
            onLeave={workflow.closeRun}
          />
        ),
    },
    {
      blocking: approval.isBlockingDisclosure,
      content:
        approval.state.phase === 'idle' ? null : (
          <RunApprovalFeedback
            state={approval.state}
            signInHref={signInHref}
            onRetry={approval.retry}
            onRecheck={workflow.recoverApproval}
            onLeave={workflow.closeRun}
          />
        ),
    },
    {
      blocking: handover.isBlockingDisclosure,
      content:
        handover.state.phase === 'idle' ? null : (
          <AssignedRunHandoverFeedback
            state={handover.state}
            signInHref={signInHref}
            onRetry={handover.retry}
            onRecheck={workflow.recoverHandover}
            onLeave={workflow.closeRun}
          />
        ),
    },
  ];
  return (
    feedback.find((item) => item.blocking)?.content ??
    feedback.find((item) => item.content !== null)?.content ??
    undefined
  );
}

const statusLabels: ReadonlyMap<string, string> = new Map([
  ['execution:submitting', 'Execution acknowledgement pending'],
  ['execution:failed', 'Execution review or acknowledgement unavailable'],
  [
    'execution:review-failed',
    'Execution review or acknowledgement unavailable',
  ],
  ['proof:submitting', 'Proof acceptance pending'],
  ['proof:failed', 'Proof acceptance result unavailable'],
  ['approval:submitting', 'Approval decision pending'],
  ['approval:failed', 'Approval result unavailable'],
  ['handover:submitting', 'Handover pending'],
  ['handover:candidate-failed', 'Recipient access unavailable'],
  ['handover:failed', 'Handover result unavailable'],
]);

export function assignedRunCommandStatus(
  workflow: AssignedRunWorkflow,
): string {
  const phases = [
    `execution:${workflow.execution.state.phase}`,
    `proof:${workflow.proofFinalization.state.phase}`,
    `approval:${workflow.approval.state.phase}`,
    `handover:${workflow.handover.state.phase}`,
  ];
  return (
    phases
      .map((phase) => statusLabels.get(phase))
      .find((label) => label !== undefined) ??
    assignedRunSnapshotStatus(
      workflow.detail.phase === 'ready' ? workflow.detail.data : undefined,
    )
  );
}

export function isRunCommandPending(workflow: AssignedRunWorkflow): boolean {
  return [
    workflow.execution.state.phase,
    workflow.proofFinalization.state.phase,
    workflow.approval.state.phase,
    workflow.handover.state.phase,
  ].includes('submitting');
}
