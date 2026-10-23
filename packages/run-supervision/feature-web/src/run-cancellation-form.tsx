import type {
  RunCancellationCommand,
  RunCancellationReview,
  RunCancellationReviewReason,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { AssignedRunFact } from './assigned-run-fact';
import { RunDecisionBoundary } from './run-action-card';

const unavailable: Record<RunCancellationReviewReason, string> = {
  DISABLED:
    'Browser cancellation is disabled. No command is available; do not bypass rollout through an internal endpoint.',
  RUN_NOT_UNTOUCHED:
    'This run is no longer untouched. Recheck current facts; cancellation cannot stop admitted or uncertain provider work.',
  AUTHORIZATION_OR_EXECUTION_RECORDED:
    'Durable authorization or execution is recorded. Even an unconsumed grant prevents cancellation; use the existing execution recovery instead.',
  ELIGIBLE:
    'No durable authorization or execution is recorded at this observation.',
};

/** RHF owns acknowledgement. Only a mounted eligible review can create immutable intent; server identity, reason and time are never caller-selected. */
export function RunCancellationForm({
  tenantId,
  runId,
  review,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly runId: string;
  readonly review: RunCancellationReview;
  readonly onConfirm: (command: RunCancellationCommand) => void;
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
  if (!review.supported || !review.canCancel || review.reason !== 'ELIGIBLE')
    return (
      <p role="status">
        {unavailable[review.reason]} No command was created. Dismiss to return
        to inspection.
      </p>
    );
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(() => {
          if (!mounted.current || review.runVersion !== 0) return;
          onConfirm({
            tenantId,
            runId,
            commandId: globalThis.crypto.randomUUID(),
            expectedSupervisionRevision: review.supervisionRevision,
            expectedRunVersion: 0,
          });
        })(event);
      }}
    >
      <h3 className="text-lg font-bold">Confirm untouched-run cancellation</h3>
      <RunDecisionBoundary title="Terminal cancellation · no provider stop">
        This records RUN_CANCELLED and ends this untouched run as CANCELLED. It
        does not stop a provider operation, revoke a grant, compensate, close
        the case, accept outcome proof, open human work or refund a retry.
      </RunDecisionBoundary>
      <dl className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <AssignedRunFact label="Supervision / run versions">
          {review.supervisionRevision} / {review.runVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Eligibility observed">
          {review.observedAt}
        </AssignedRunFact>
      </dl>
      <p className="text-sm leading-6 text-ink-muted">
        The server rechecks current supervision, resolver authority, version
        zero and absence of every durable authorization or execution record.
        Review is advisory, not a permission token. Cancellation does not close
        the case or verify its outcome.
      </p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={
            errors.acknowledge ? `cancellation-ack-${id}` : undefined
          }
          {...register('acknowledge', {
            validate: (checked) =>
              checked ||
              'Acknowledge the untouched-run cancellation boundary before confirming.',
          })}
        />
        <span>
          I understand this ends only the untouched run, not provider work or
          the case, and does not verify the outcome.
        </span>
      </label>
      {errors.acknowledge ? (
        <p id={`cancellation-ack-${id}`} role="alert" className="text-sm">
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">Cancel untouched run</Button>
    </form>
  );
}
