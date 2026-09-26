import { Schema } from 'effect';

const utcInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => !Number.isNaN(Date.parse(value))),
);
const queueKey = Schema.String.pipe(Schema.pattern(/^[a-z][a-z0-9-]{0,62}$/));
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
});
const claimSchema = Schema.Struct({
  claimId: Schema.UUID,
  workItemId: Schema.UUID,
  claimedAt: utcInstant,
  recordedAt: utcInstant,
});

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
}).pipe(
  Schema.filter(
    ({ workItem, claim }) => workItem.workItemId === claim.workItemId,
  ),
);

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

export const csrfTokenSchema = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.NonEmptyString,
});

export const humanFollowUpClaimSchema = claimSchema;

export const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});

export type BrowserCsrfToken = Schema.Schema.Type<typeof csrfTokenSchema>;
export type ProblemDetail = Schema.Schema.Type<typeof problemDetailSchema>;
export type ResolverFollowUpCaseSummaryPayload = Schema.Schema.Type<
  typeof resolverFollowUpCaseSummarySchema
>;
