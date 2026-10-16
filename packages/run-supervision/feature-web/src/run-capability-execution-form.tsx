import type {
  AssignedRunConsole,
  RunExecutionCommand,
  RunExecutionReview,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { AssignedRunFact } from './assigned-run-fact';

/** Acknowledgement belongs to RHF. No command identity is minted until valid, still-mounted confirmation; remote facts remain RTK-owned props. */
export function RunCapabilityExecutionForm({
  tenantId,
  run,
  review,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly review: RunExecutionReview;
  readonly onConfirm: (command: RunExecutionCommand) => void;
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
  if (!review.supported)
    return (
      <p role="status">
        Browser execution is disabled. Existing reservations remain durable; do
        not bypass rollout through internal endpoints.
      </p>
    );
  if (!review.canExecute && !review.canResume)
    return (
      <p role="status">
        No execution or recovery is eligible for this snapshot. Prerequisites
        may be unavailable, or an existing command may belong to another actor.
        Recheck current run facts; do not create replacement intent.
      </p>
    );
  const resuming = review.canResume;
  function confirm(): void {
    if (!mounted.current || review.runVersion !== 0) return;
    const coordinates = {
      tenantId,
      runId: run.runId,
      expectedSupervisionRevision: review.supervisionRevision,
      expectedRunVersion: 0 as const,
    };
    if (resuming && review.commandId !== null)
      onConfirm({
        ...coordinates,
        kind: 'resume',
        commandId: review.commandId,
        attemptId: globalThis.crypto.randomUUID(),
      });
    else if (
      review.canExecute &&
      review.requestId !== null &&
      review.decisionId !== null
    )
      onConfirm({
        ...coordinates,
        kind: 'execute',
        commandId: globalThis.crypto.randomUUID(),
        requestId: review.requestId,
        decisionId: review.decisionId,
      });
  }
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(confirm)(event);
      }}
    >
      <h3 className="text-lg font-bold">
        {resuming
          ? 'Confirm a new recovery attempt'
          : 'Confirm pinned capability execution'}
      </h3>
      <p className="text-sm leading-6">
        {resuming
          ? 'This is a new dispatch attempt against the original reservation, not a status recheck or a new authorization. It may invoke the same provider operation again with its original idempotency key.'
          : 'Admission derives and consumes the exact approved authorization and commits before connector I/O. Once admitted, leaving, timeout or later handover cannot cancel the external effect.'}
      </p>
      <dl className="grid gap-3 rounded-md border border-border p-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <AssignedRunFact label="Pinned action">{run.stepId}</AssignedRunFact>
        <AssignedRunFact label="Capability">{run.capability}</AssignedRunFact>
        <AssignedRunFact label="Effective risk">
          {run.effectiveRisk}
        </AssignedRunFact>
        <AssignedRunFact label="Policy revision">
          {run.policyRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Supervision / run versions">
          {review.supervisionRevision} / {review.runVersion}
        </AssignedRunFact>
        <AssignedRunFact
          label={resuming ? 'Original command' : 'Exact approved decision'}
        >
          {resuming ? review.commandId : review.decisionId}
        </AssignedRunFact>
      </dl>
      <p className="text-sm leading-6 text-ink-muted">
        The server rechecks current authority and exact coordinates. A
        successful action reaches VERIFYING only: independent outcome evidence
        and separate proof acceptance are still required. No automatic retry
        occurs.
      </p>
      {resuming ? (
        <p className="text-sm text-ink-muted">
          Only the original actor who currently supervises with current resolver
          authority may recover. An expired approval window does not create a
          fresh grant; a handback needs its new epoch.
        </p>
      ) : null}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={
            errors.acknowledge ? `execution-ack-${id}` : undefined
          }
          {...register('acknowledge', {
            validate: (checked) =>
              checked ||
              'Acknowledge the external effect and recovery boundary before confirming.',
          })}
        />
        <span>
          {resuming
            ? 'I confirm a new recovery attempt on the original reservation, not a status recheck.'
            : 'I reviewed the pinned action and understand that admission cannot be cancelled here.'}
        </span>
      </label>
      {errors.acknowledge ? (
        <p role="alert" id={`execution-ack-${id}`}>
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">
        {resuming
          ? 'Confirm new recovery attempt'
          : 'Authorize and execute pinned action'}
      </Button>
    </form>
  );
}
