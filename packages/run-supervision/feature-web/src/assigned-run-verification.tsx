import type {
  AssignedRunConsole,
  RunOutcomeVerification,
} from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';
import { AssignedRunFact } from './assigned-run-fact';
import { AssignedRunProofInspector } from './assigned-run-proof-inspector';
import { formatRecordedAt, isTerminalState } from './run-supervision-copy';

const statusLabels = {
  NOT_ASSESSED: 'Outcome not assessed',
  PENDING: 'Outcome proof pending',
  MATCHING: 'Condition matches · not durably accepted',
  ACCEPTED: 'Durable outcome proof accepted',
} satisfies Record<RunOutcomeVerification['status'], string>;

/** One server-evaluated condition, never a synthesized checklist. All records retire with the enclosing Console gate. */
export function AssignedRunVerification({
  run,
}: {
  readonly run: AssignedRunConsole;
}): ReactElement {
  const proof = run.outcomeVerification;
  if (proof === undefined)
    return <UnsupportedVerification terminal={isTerminalState(run.state)} />;
  return (
    <section
      aria-label="Outcome verification"
      className="rounded-md border border-accent-strong/40 bg-canvas/60 p-4"
    >
      <h3 className="font-bold text-ink">{statusLabels[proof.status]}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        {verificationExplanation(proof)}
      </p>
      <dl className="mt-4 grid gap-4 text-sm">
        <AssignedRunFact label="Pinned outcome condition">
          {proof.property} = {proof.expectedValue}
        </AssignedRunFact>
        {proof.caseStreamVersion !== null ? (
          <AssignedRunFact label="Assessed case version">
            {proof.caseStreamVersion}
          </AssignedRunFact>
        ) : null}
        {proof.evidence !== null ? (
          <AssignedRunFact label="Selected actual value">
            {proof.evidence.value}
          </AssignedRunFact>
        ) : null}
      </dl>
      {proof.acceptance !== null ? (
        <dl className="mt-4 grid gap-4 text-sm">
          <AssignedRunFact label="Acceptance run sequence">
            {proof.acceptance.runSequence}
          </AssignedRunFact>
          <AssignedRunFact label="Accepted">
            <time dateTime={proof.acceptance.acceptedAt}>
              {formatRecordedAt(proof.acceptance.acceptedAt)}
            </time>
          </AssignedRunFact>
          <AssignedRunFact label="Acceptance recorded">
            <time dateTime={proof.acceptance.recordedAt}>
              {formatRecordedAt(proof.acceptance.recordedAt)}
            </time>
          </AssignedRunFact>
          <AssignedRunFact label="Verified case closure version">
            {proof.acceptance.caseClosureStreamVersion}
          </AssignedRunFact>
        </dl>
      ) : null}
      {proof.evidence !== null ? (
        <div className="mt-4">
          <AssignedRunProofInspector
            key={`${run.runId}:${proof.status}:${proof.caseStreamVersion}:${proof.evidence.factId}`}
            evidence={proof.evidence}
          />
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        This view reads one recorded contract condition. It cannot accept proof,
        execute an action or independently verify the external account.
      </p>
    </section>
  );
}

function verificationExplanation(proof: RunOutcomeVerification): string {
  switch (proof.status) {
    case 'NOT_ASSESSED':
      return 'This run is not in the verification state. The pinned requirement is shown without evaluating current case evidence.';
    case 'PENDING':
      return proof.reason === 'ELIGIBLE_EVIDENCE_MISSING'
        ? 'No eligible post-action binding and source were found at this case version. A successful connector receipt alone is not proof.'
        : 'The latest eligible post-action binding differs from the expected value. This is a failed condition match, not a generalized contradiction assessment.';
    case 'MATCHING':
      return 'The latest eligible evidence matches at this case version. This read does not freeze evidence, resolve the case or commit acceptance. Later eligible evidence can change the assessment.';
    case 'ACCEPTED':
      return 'The runtime durably accepted this exact evidence and atomically recorded verified run completion and case closure. This is the stored decision, not a new browser assessment.';
  }
}

function UnsupportedVerification({
  terminal,
}: {
  readonly terminal: boolean;
}): ReactElement {
  return (
    <div className="rounded-md border border-border bg-canvas/60 p-4">
      <h3 className="font-bold text-ink">
        {terminal
          ? 'Recorded terminal state · proof not included'
          : 'Outcome is not established by this view'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        This server does not supply outcome verification. Unsupported is not
        pending, failed or accepted proof.
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Verification checks and accepted proof are not included in this read
        model.
      </p>
    </div>
  );
}
