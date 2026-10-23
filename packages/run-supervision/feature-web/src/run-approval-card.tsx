import type {
  AssignedRunConsole,
  RunApprovalCommand,
  RunApprovalOutcome,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { useForm } from 'react-hook-form';
import { formatRecordedAt } from './run-supervision-copy';
import { RunDecisionBoundary } from './run-action-card';

const lifecycleCopy = {
  NOT_REQUIRED:
    'The pinned capability has no human approval prerequisite. Other authorization gates still apply.',
  NOT_REQUESTED:
    'No approval request has been recorded. Request creation remains a trusted runtime operation; recheck after one is created.',
  PENDING:
    'A human decision is pending. Both approval and rejection require the exact requested authority.',
  EXPIRED:
    'This request has expired. A trusted runtime must append a replacement; you cannot extend or answer this request.',
  DECIDED:
    'This request has an immutable human response. It cannot be answered again or withdrawn here.',
} as const;

/** Current approval facts derive from the gated RTK Console; withdrawal unmounts confirmation and retires form callbacks. */
export function RunApprovalCard({
  tenantId,
  run,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunApprovalCommand) => void;
}): ReactElement {
  const review = run.approvalReview;
  const [choice, setChoice] = useState<RunApprovalOutcome | null>(null);
  const approveTrigger = useRef<HTMLButtonElement>(null);
  const rejectTrigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const canDecide =
    review?.canDecide === true && run.supervisionRevision !== undefined;
  return (
    <section
      aria-labelledby={`approval-${id}`}
      className="min-w-0 border-s-2 border-border bg-surface p-4 [overflow-wrap:anywhere]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">
            Prerequisite only · no execution
          </p>
          <h3 id={`approval-${id}`} className="mt-2 font-extrabold text-ink">
            Human approval review
          </h3>
        </div>
        <span className="rounded border border-highlight/60 px-2 py-1 text-xs font-bold text-highlight">
          {review?.status ?? 'UNSUPPORTED'}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        {review === undefined
          ? 'This server does not supply approval review. The pinned policy requirement is not a pending request or permission to decide.'
          : lifecycleCopy[review.status]}
      </p>
      {review?.request != null ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-ink-muted">Request</dt>
            <dd className="font-mono text-xs [overflow-wrap:anywhere]">
              {review.request.requestId}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Exact authority required</dt>
            <dd className="font-semibold">
              {review.request.authority}
              {review.request.authority === 'REQUESTER'
                ? ' · this case only'
                : ' · this tenant'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Expires</dt>
            <dd>
              <time dateTime={review.request.expiresAt}>
                {formatRecordedAt(review.request.expiresAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Server observation</dt>
            <dd>
              <time dateTime={review.observedAt}>
                {formatRecordedAt(review.observedAt)}
              </time>
            </dd>
          </div>
        </dl>
      ) : null}
      {review?.decision != null ? (
        <p className="mt-4 text-sm font-semibold">
          Human response: {review.decision.outcome} ·{' '}
          <time dateTime={review.decision.decidedAt}>
            {formatRecordedAt(review.decision.decidedAt)}
          </time>
        </p>
      ) : null}
      {review?.status === 'PENDING' && !canDecide ? (
        <p className="mt-4 text-sm text-ink-muted">
          Decision unavailable for this snapshot: rollout, current run state or
          matching authority does not permit it. Resolver authority does not
          substitute for case-scoped requester authority.
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        A human response does not grant or execute a capability, resume the run,
        or verify its outcome. Recheck for a fresh server observation; no local
        countdown establishes validity.
      </p>
      {canDecide ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button ref={approveTrigger} onClick={() => setChoice('APPROVED')}>
            Approve prerequisite
          </Button>
          <Button
            ref={rejectTrigger}
            variant="quiet"
            onClick={() => setChoice('REJECTED')}
          >
            Reject prerequisite
          </Button>
        </div>
      ) : null}
      {choice !== null &&
      canDecide &&
      review?.request != null &&
      run.supervisionRevision !== undefined ? (
        <ModalDialog
          id={`approval-confirm-${id}`}
          title={
            choice === 'APPROVED'
              ? 'Confirm approval prerequisite'
              : 'Confirm rejection prerequisite'
          }
          dismissLabel="Cancel decision"
          returnFocusRef={
            choice === 'APPROVED' ? approveTrigger : rejectTrigger
          }
          onDismiss={() => setChoice(null)}
        >
          <RunApprovalConfirmation
            outcome={choice}
            run={run}
            requestId={review.request.requestId}
            onConfirm={() => {
              if (
                review.request !== null &&
                run.supervisionRevision !== undefined
              )
                onConfirm({
                  tenantId,
                  runId: run.runId,
                  requestId: review.request.requestId,
                  expectedSupervisionRevision: run.supervisionRevision,
                  outcome: choice,
                  commandId: globalThis.crypto.randomUUID(),
                });
            }}
          />
        </ModalDialog>
      ) : null}
    </section>
  );
}

function RunApprovalConfirmation({
  outcome,
  run,
  requestId,
  onConfirm,
}: {
  readonly outcome: RunApprovalOutcome;
  readonly run: AssignedRunConsole;
  readonly requestId: string;
  readonly onConfirm: () => void;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ acknowledge: boolean }>({
    defaultValues: { acknowledge: false },
  });
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const id = useId();
  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(() => {
          if (mounted.current) onConfirm();
        })(event);
      }}
      className="flex flex-col gap-5"
    >
      <dl className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-ink-muted">Pinned capability</dt>
          <dd className="font-mono [overflow-wrap:anywhere]">
            {run.capability}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-muted">Step and effective risk</dt>
          <dd className="font-semibold [overflow-wrap:anywhere]">
            {run.stepId} · {run.effectiveRisk}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-muted">Exact request</dt>
          <dd className="font-mono text-xs [overflow-wrap:anywhere]">
            {requestId}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Supervision revision</dt>
          <dd>{run.supervisionRevision}</dd>
        </div>
      </dl>
      <RunDecisionBoundary title="Immutable human response">
        You will record {outcome} for the currently reviewed request. The server
        rechecks supervision revision, expiry, runtime state and exact
        authority. This immutable response cannot be edited or withdrawn here.
      </RunDecisionBoundary>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={
            errors.acknowledge ? `acknowledge-${id}` : undefined
          }
          {...register('acknowledge', {
            validate: (checked) =>
              checked || 'Acknowledge the decision boundary before submitting.',
          })}
        />
        <span>
          I understand this records a human prerequisite only, not permission to
          execute.
        </span>
      </label>
      {errors.acknowledge ? (
        <p id={`acknowledge-${id}`} role="alert" className="text-sm text-ink">
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">
        {outcome === 'APPROVED' ? 'Record approval' : 'Record rejection'}
      </Button>
    </form>
  );
}
