import type {
  RunEscalationCommand,
  RunEscalationReview,
  RunEscalationReviewReason,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { AssignedRunFact } from './assigned-run-fact';

const unavailable: Record<RunEscalationReviewReason, string> = {
  DISABLED:
    'Browser exhausted-run escalation is disabled. No command is available; do not bypass rollout through an internal endpoint.',
  RUN_NOT_FAILED:
    'The run is not at the eligible failed revision. Recheck current run facts before a new decision.',
  RETRY_BUDGET_AVAILABLE:
    'Retry budget remains. This escalation cannot skip policy-bounded automated recovery; review fresh-run retry separately.',
  RETRY_ATTEMPT_LIMIT_REACHED: 'The runtime total-attempt limit is reached.',
};

/** RHF owns acknowledgement; only valid mounted exhausted review creates intent. Queue, actor, work identity and time remain server-owned. */
export function RunEscalationForm({
  tenantId,
  runId,
  review,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly runId: string;
  readonly review: RunEscalationReview;
  readonly onConfirm: (command: RunEscalationCommand) => void;
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
  if (
    !review.canEscalate ||
    !review.supported ||
    review.reason !== 'RETRY_ATTEMPT_LIMIT_REACHED'
  )
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
            sourceAttemptNumber: review.attemptNumber,
            retryPolicyRevision: review.retryPolicyRevision,
            maximumAttempts: review.maximumAttempts,
            reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
          });
        })(event);
      }}
    >
      <h3 className="text-lg font-bold">Confirm unassigned human follow-up</h3>
      <p className="text-sm leading-6">
        This ends exhausted automated recovery by recording ESCALATED and
        opening one unassigned work item in the server-selected
        access-restoration queue. It does not create a third attempt, invoke a
        connector, claim work or close the case.
      </p>
      <dl className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <AssignedRunFact label="Retry policy">
          {review.retryPolicyRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Attempt / total ceiling">
          {review.attemptNumber} / {review.maximumAttempts}
        </AssignedRunFact>
        <AssignedRunFact label="Supervision / run versions">
          {review.supervisionRevision} / {review.runVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Destination queue">
          {review.followUpQueueKey}
        </AssignedRunFact>
      </dl>
      <p className="text-sm leading-6 text-ink-muted">
        The server rechecks the exact supervisor, resolver authority, failed
        revision and exhaustion policy. Changed coordinates conflict. A creation
        acknowledgement grants neither current run access nor ownership of the
        follow-up. Queue discovery and claiming remain separate authorized
        steps.
      </p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={
            errors.acknowledge ? `escalation-ack-${id}` : undefined
          }
          {...register('acknowledge', {
            validate: (checked) =>
              checked ||
              'Acknowledge the terminal escalation boundary before confirming.',
          })}
        />
        <span>
          I reviewed this exhausted retry budget and understand that human
          follow-up is unassigned and escalation does not close the case.
        </span>
      </label>
      {errors.acknowledge ? (
        <p id={`escalation-ack-${id}`} role="alert" className="text-sm">
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">Open unassigned human follow-up</Button>
    </form>
  );
}
