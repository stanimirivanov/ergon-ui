import { Schema } from 'effect';

const utcInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => !Number.isNaN(Date.parse(value))),
);
const queueKey = Schema.String.pipe(Schema.pattern(/^[a-z][a-z0-9-]{0,62}$/));
const ownershipRevision = Schema.Int.pipe(
  Schema.between(0, Number.MAX_SAFE_INTEGER),
);
const cursorSchema = Schema.Struct({
  afterOpenedAt: utcInstant,
  afterWorkItemId: Schema.UUID,
});
const workItemSchema = Schema.Struct({
  workItemId: Schema.UUID,
  caseId: Schema.UUID,
  runId: Schema.UUID,
  escalationEventId: Schema.UUID,
  reason: Schema.NonEmptyString,
  queueKey,
  status: Schema.Literal('OPEN'),
  openedAt: utcInstant,
  recordedAt: utcInstant,
  ownershipRevision,
});
const claimSchema = Schema.Struct({
  claimId: Schema.UUID,
  workItemId: Schema.UUID,
  claimedAt: utcInstant,
  recordedAt: utcInstant,
});

/** Structural wire contract for one oldest-first visible-work page. */
export const humanFollowUpPageSchema = Schema.Struct({
  items: Schema.Array(workItemSchema),
  nextCursor: Schema.NullOr(cursorSchema),
});

const ownedCursorSchema = Schema.Struct({
  afterClaimedAt: utcInstant,
  afterClaimId: Schema.UUID,
});
const ownedWorkSchema = Schema.Struct({
  workItem: workItemSchema,
  claim: claimSchema,
});

/**
 * Structural wire contract for resolver-owned work.
 *
 * The model checks claim/work-item pairing after structural decoding.
 */
export const resolverOwnedHumanFollowUpPageSchema = Schema.Struct({
  items: Schema.Array(ownedWorkSchema),
  nextCursor: Schema.NullOr(ownedCursorSchema),
});

const resolutionContractSchema = Schema.Struct({
  key: Schema.NonEmptyString,
  revision: Schema.Number,
});
const caseObservationSchema = Schema.Struct({
  streamVersion: Schema.Number,
  eventType: Schema.NonEmptyString,
  summary: Schema.NonEmptyString,
  observationId: Schema.UUID,
  originType: Schema.NonEmptyString,
  provider: Schema.NonEmptyString,
  reference: Schema.NullOr(Schema.NonEmptyString),
  content: Schema.NonEmptyString,
  occurredAt: utcInstant,
  recordedAt: utcInstant,
});

/**
 * Structural wire contract for the resolver case-context response.
 *
 * Cross-field identity, contract, version, ordering, and handoff invariants are
 * enforced after structural decoding because they depend on both the request
 * and multiple response sections.
 */
export const resolverFollowUpCaseSummarySchema = Schema.Struct({
  followUp: Schema.Struct({
    workItemId: Schema.UUID,
    queueKey,
    escalationReason: Schema.NonEmptyString,
    openedAt: utcInstant,
    claimedAt: utcInstant,
  }),
  case: Schema.Struct({
    caseId: Schema.UUID,
    goal: Schema.NonEmptyString,
    status: Schema.Literal('OPEN'),
    streamVersion: Schema.Number,
    resolutionContract: Schema.NullOr(resolutionContractSchema),
  }),
  observations: Schema.Array(caseObservationSchema),
  resolutionRun: Schema.Struct({
    runId: Schema.UUID,
    caseEvidenceStreamVersion: Schema.Number,
    contractKey: Schema.NonEmptyString,
    contractRevision: Schema.Number,
    policyRevision: Schema.NonEmptyString,
    stepId: Schema.NonEmptyString,
    capability: Schema.NonEmptyString,
    effectiveRisk: Schema.Literal('LOW', 'MEDIUM', 'HIGH'),
    requiredApproval: Schema.NonEmptyString,
    attemptNumber: Schema.Number,
    predecessorRunId: Schema.NullOr(Schema.UUID),
    state: Schema.Literal('ESCALATED'),
    stateVersion: Schema.Number,
    stateUpdatedAt: utcInstant,
    recordedAt: utcInstant,
  }),
  failedExecution: Schema.Struct({
    connector: Schema.NonEmptyString,
    outcome: Schema.Literal('FAILED'),
    completedAt: utcInstant,
    recordedAt: utcInstant,
  }),
  escalation: Schema.Struct({
    retryPolicyRevision: Schema.NonEmptyString,
    sourceAttemptNumber: Schema.Number,
    maximumAttempts: Schema.Number,
    occurredAt: utcInstant,
    recordedAt: utcInstant,
  }),
});

/**
 * Ephemeral browser CSRF wire contract.
 *
 * Restricting the header name prevents an untrusted response from selecting an
 * arbitrary request header.
 */
export const csrfTokenSchema = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.NonEmptyString,
});

/** Structural wire contract for a recorded follow-up claim. */
export const humanFollowUpClaimCommandSchema = Schema.Struct({
  commandId: Schema.UUID,
  ownershipRevision,
  claim: claimSchema,
});

/** Browser-safe receipt for an exact active-claim release. */
export const humanFollowUpReleaseSchema = Schema.Struct({
  claimId: Schema.UUID,
  workItemId: Schema.UUID,
  ownershipRevision,
  releasedAt: utcInstant,
  recordedAt: utcInstant,
});

/**
 * Minimal problem-detail fields accepted for failure classification.
 * Unused descriptive fields are deliberately not admitted into application
 * state or telemetry.
 */
export const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});

/** Validated ephemeral CSRF token retained only by the adapter instance. */
export type BrowserCsrfToken = Schema.Schema.Type<typeof csrfTokenSchema>;

/** Validated problem fields used by the protocol-to-typed-failure mapper. */
export type ProblemDetail = Schema.Schema.Type<typeof problemDetailSchema>;
