import type {
  RunRetryCommand,
  RunRetryReview,
  RunRetryReviewReason,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { AssignedRunFact } from './assigned-run-fact';
import { RunDecisionBoundary } from './run-action-card';

const unavailable: Record<RunRetryReviewReason, string> = {
  DISABLED:
    'Browser failed-run retry is disabled. Deploy compatible assignment readers before enabling the backend flag. No command is available.',
  RUN_NOT_FAILED:
    'The run is not at the eligible failed revision. Recheck current run facts before making another decision.',
  ATTEMPT_LIMIT_REACHED:
    'The total-attempt limit is reached. This view cannot create another attempt. Cancel and review exhausted-run escalation separately when supported.',
  PLAN_NOT_READY:
    'Current evidence is not ready for a fresh plan. No successor can be confirmed from this observation.',
  PLAN_DENIED:
    'Current policy denies a successor. A previous approval does not override current planning.',
  OPERATION_CHANGED:
    'Current planning changes the contract, step or capability. That is not a retry of the failed operation.',
};

/** RHF owns acknowledgement; exact immutable intent is created only after valid, still-mounted confirmation. The RTK review is never retained as a second resource. */
export function RunRetryForm({
  tenantId,
  runId,
  review,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly runId: string;
  readonly review: RunRetryReview;
  readonly onConfirm: (command: RunRetryCommand) => void;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ acknowledge: boolean }>({
    defaultValues: { acknowledge: false },
  });
  const mounted = useRef(false);
  const id = useId();
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (!review.canRetry)
    return (
      <div className="space-y-3">
        <p role="status">{unavailable[review.reason]}</p>
        <p className="text-sm text-ink-muted">
          Recorded attempt {review.attemptNumber} of {review.maximumAttempts}{' '}
          total · {review.retryPolicyRevision}. No command was created. Cancel
          to return to inspection.
        </p>
      </div>
    );
  const plan = review.plan;
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(() => {
          if (!mounted.current || review.runVersion !== 1) return;
          onConfirm({
            tenantId,
            runId,
            commandId: globalThis.crypto.randomUUID(),
            expectedSupervisionRevision: review.supervisionRevision,
            expectedRunVersion: 1,
            expectedAttemptNumber: review.attemptNumber,
            retryPolicyRevision: review.retryPolicyRevision,
            maximumAttempts: review.maximumAttempts,
            plan,
          });
        })(event);
      }}
    >
      <h3 className="text-lg font-bold">Confirm a fresh successor</h3>
      <RunDecisionBoundary title="Fresh successor · new safeguards">
        This atomically supersedes the failed run and creates attempt{' '}
        {review.attemptNumber + 1} of {review.maximumAttempts}, initially
        supervised by you. It does not recover the old invocation, call a
        connector or close the case.
      </RunDecisionBoundary>
      <dl className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <AssignedRunFact label="Retry policy">
          {review.retryPolicyRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Reviewed case version">
          {plan.caseStreamVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Contract / revision">
          {plan.contractKey} / {plan.contractRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Pinned step">{plan.stepId}</AssignedRunFact>
        <AssignedRunFact label="Capability">{plan.capability}</AssignedRunFact>
        <AssignedRunFact label="Current planning policy">
          {plan.policyRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Fresh effective risk">
          {plan.effectiveRisk}
        </AssignedRunFact>
        <AssignedRunFact label="Fresh approval requirement">
          {plan.requiredApproval}
        </AssignedRunFact>
        <AssignedRunFact label="Supervision / run versions">
          {review.supervisionRevision} / {review.runVersion}
        </AssignedRunFact>
      </dl>
      <p className="text-sm leading-6 text-ink-muted">
        The server rechecks current authority and this exact plan. Changed
        evidence or supervision requires a new review. No approval, grant,
        consumption, receipt or provider key is inherited. The successor needs
        its own safeguards before execution.
      </p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={errors.acknowledge ? `retry-ack-${id}` : undefined}
          {...register('acknowledge', {
            validate: (checked) =>
              checked ||
              'Acknowledge the fresh-run boundary before confirming.',
          })}
        />
        <span>
          I reviewed this exact plan and understand that a fresh run inherits no
          execution authority.
        </span>
      </label>
      {errors.acknowledge ? (
        <p id={`retry-ack-${id}`} role="alert" className="text-sm">
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">Create fresh successor</Button>
    </form>
  );
}
