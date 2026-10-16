import type {
  AssignedRunConsole,
  RunProofFinalizationCommand,
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

/** Eligibility is snapshot-derived; the server rechecks exact proof and authority. Modal state never retains evidence. */
export function RunProofFinalizationControl({
  tenantId,
  run,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly run: AssignedRunConsole;
  readonly onConfirm: (command: RunProofFinalizationCommand) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const proof = run.outcomeVerification;
  const supervisionRevision = run.supervisionRevision;
  if (proof?.status !== 'MATCHING') return <></>;
  if (
    run.proofFinalizationSupported !== true ||
    supervisionRevision === undefined
  )
    return (
      <p className="text-sm leading-6 text-ink-muted">
        {run.proofFinalizationSupported === false
          ? 'Browser proof finalization is disabled. A match alone does not close the case.'
          : 'This server does not support browser proof finalization. A match alone does not close the case.'}
      </p>
    );
  if (run.state !== 'VERIFYING' || run.stateVersion !== 1) return <></>;
  return (
    <>
      <Button ref={trigger} onClick={() => setOpen(true)}>
        Accept proof and resolve case
      </Button>
      {open ? (
        <ModalDialog
          id={`proof-finalization-${id}`}
          title="Confirm outcome proof acceptance"
          dismissLabel="Cancel proof acceptance"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <RunProofConfirmation
            run={run}
            onConfirm={() =>
              onConfirm({
                tenantId,
                runId: run.runId,
                commandId: globalThis.crypto.randomUUID(),
                expectedSupervisionRevision: supervisionRevision,
                expectedRunVersion: run.stateVersion,
                expectedCaseVersion: proof.caseStreamVersion,
                factId: proof.evidence.factId,
                observationId: proof.evidence.source.observationId,
              })
            }
          />
        </ModalDialog>
      ) : null}
    </>
  );
}

/** The acknowledgement is form state; asynchronous validation callbacks retire when the private view unmounts. */
function RunProofConfirmation({
  run,
  onConfirm,
}: {
  readonly run: AssignedRunConsole;
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
  const proof = run.outcomeVerification;
  if (proof?.status !== 'MATCHING') return <></>;
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(() => {
          if (mounted.current) onConfirm();
        })(event);
      }}
    >
      <p className="text-sm leading-6">
        Accept the reviewed {proof.property} = {proof.expectedValue} proof. This
        atomically completes the run and closes the case as verified resolved.
        It does not invoke the capability again.
      </p>
      <dl className="grid gap-3 rounded-md border border-border p-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
        <div>
          <dt className="text-ink-muted">Case</dt>
          <dd>{run.caseId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Reviewed case version</dt>
          <dd>{proof.caseStreamVersion}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Supervision / run versions</dt>
          <dd>
            {run.supervisionRevision} / {run.stateVersion}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Resulting closure version</dt>
          <dd>{proof.caseStreamVersion + 1}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Exact fact</dt>
          <dd className="font-mono text-xs">{proof.evidence.factId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Exact source observation</dt>
          <dd className="font-mono text-xs">
            {proof.evidence.source.observationId}
          </dd>
        </div>
      </dl>
      <p className="text-sm leading-6 text-ink-muted">
        The server reassesses this exact evidence and rechecks your current
        supervision and resolver authority. Changed evidence requires a new
        review. This durable acceptance cannot be undone here.
      </p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          aria-invalid={errors.acknowledge !== undefined}
          aria-describedby={errors.acknowledge ? `proof-ack-${id}` : undefined}
          {...register('acknowledge', {
            validate: (checked) =>
              checked ||
              'Confirm the exact proof and case closure before submitting.',
          })}
        />
        <span>
          I reviewed this exact proof and understand that acceptance closes the
          case.
        </span>
      </label>
      {errors.acknowledge ? (
        <p role="alert" id={`proof-ack-${id}`} className="text-sm">
          {errors.acknowledge.message}
        </p>
      ) : null}
      <Button type="submit">Record acceptance and close case</Button>
    </form>
  );
}
