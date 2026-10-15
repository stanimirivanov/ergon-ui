import { Schema } from 'effect';
import type { AssignedRunConsole } from '../contracts';
import { compareUtcInstants, isUtcInstant } from './run-wire-instant';

const version = Schema.Number.pipe(
  Schema.filter((value) => Number.isSafeInteger(value) && value > 0),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const text = (maximum: number): Schema.Schema<string> =>
  Schema.String.pipe(
    Schema.filter(
      (value) => value.trim().length > 0 && value.length <= maximum,
    ),
  );
const condition = {
  property: Schema.Literal('account.access.state'),
  // Published contract values are opaque strings, not the observed account-state enum.
  expectedValue: text(200),
};
const evidence = Schema.Struct({
  factId: uuid,
  streamVersion: version,
  value: Schema.Literal('ACTIVE', 'LOCKED'),
  accountReference: text(500),
  boundAt: instant,
  source: Schema.Struct({
    observationId: uuid,
    streamVersion: version,
    originType: Schema.Literal('CONNECTOR'),
    provider: text(100).pipe(Schema.pattern(/^[a-z0-9][a-z0-9._-]*$/)),
    reference: text(500),
    content: text(8000),
    observedAt: instant,
  }),
});

/** Shape is closed by status; unknown/private extras are stripped, never cached. */
export const runVerificationSchema = Schema.Union(
  Schema.Struct({
    ...condition,
    status: Schema.Literal('NOT_ASSESSED'),
    reason: Schema.Literal('RUN_NOT_VERIFYING'),
    caseStreamVersion: Schema.Null,
    evidence: Schema.Null,
    acceptance: Schema.Null,
  }),
  Schema.Struct({
    ...condition,
    status: Schema.Literal('PENDING'),
    reason: Schema.Literal('ELIGIBLE_EVIDENCE_MISSING'),
    caseStreamVersion: version,
    evidence: Schema.Null,
    acceptance: Schema.Null,
  }),
  Schema.Struct({
    ...condition,
    status: Schema.Literal('PENDING'),
    reason: Schema.Literal('VALUE_MISMATCH'),
    caseStreamVersion: version,
    evidence,
    acceptance: Schema.Null,
  }),
  Schema.Struct({
    ...condition,
    status: Schema.Literal('MATCHING'),
    reason: Schema.Null,
    caseStreamVersion: version,
    evidence,
    acceptance: Schema.Null,
  }),
  Schema.Struct({
    ...condition,
    status: Schema.Literal('ACCEPTED'),
    reason: Schema.Null,
    caseStreamVersion: version,
    evidence,
    acceptance: Schema.Struct({
      runSequence: Schema.Literal(2),
      acceptedAt: instant,
      recordedAt: instant,
      caseClosureStreamVersion: version,
    }),
  }),
);

/** Cross-check one selected citation against the run, successful action and exact state prefix; never repair partial proof. */
export function isConsistentVerification(run: AssignedRunConsole): boolean {
  const proof = run.outcomeVerification;
  if (proof === undefined) return true;
  const eligibleState =
    run.state === 'VERIFYING' || run.state === 'VERIFIED_RESOLVED';
  if (proof.status === 'NOT_ASSESSED') return !eligibleState;
  if (
    !eligibleState ||
    run.execution?.outcome !== 'SUCCEEDED' ||
    run.transitions === undefined
  )
    return false;
  if ((proof.status === 'ACCEPTED') !== (run.state === 'VERIFIED_RESOLVED'))
    return false;
  if (proof.caseStreamVersion < run.caseEvidenceStreamVersion) return false;
  const fact = proof.evidence;
  if (fact !== null) {
    if (
      fact.source.streamVersion <= run.caseEvidenceStreamVersion ||
      fact.streamVersion <= fact.source.streamVersion ||
      fact.streamVersion > proof.caseStreamVersion ||
      fact.accountReference !== fact.source.reference ||
      compareUtcInstants(fact.source.observedAt, run.execution.completedAt) <
        0 ||
      compareUtcInstants(fact.boundAt, fact.source.observedAt) < 0
    )
      return false;
    if (
      (proof.reason === 'VALUE_MISMATCH') ===
      (fact.value === proof.expectedValue)
    )
      return false;
  }
  if (proof.acceptance !== null) {
    const accepted = proof.acceptance;
    return (
      accepted.runSequence === run.stateVersion &&
      Number.isSafeInteger(proof.caseStreamVersion + 1) &&
      accepted.caseClosureStreamVersion === proof.caseStreamVersion + 1 &&
      compareUtcInstants(accepted.acceptedAt, run.stateUpdatedAt) === 0
    );
  }
  return run.stateVersion === 1;
}
