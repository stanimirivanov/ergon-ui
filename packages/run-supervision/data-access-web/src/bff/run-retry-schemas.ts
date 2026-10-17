import { Either, Schema } from 'effect';
import type {
  RunRetryCommand,
  RunRetryReceipt,
  RunRetryReview,
  RunRetryReviewQuery,
} from '../retry-contracts';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const revision = Schema.Number.pipe(
  Schema.filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value < Number.MAX_SAFE_INTEGER,
  ),
);
const positiveVersion = revision.pipe(Schema.filter((value) => value > 0));
const positiveInt = Schema.Number.pipe(
  Schema.filter(
    (value) => Number.isInteger(value) && value > 0 && value <= 2_147_483_647,
  ),
);
const label = Schema.String.pipe(
  Schema.filter((value) => value.trim().length > 0 && value.length <= 200),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
});
const planSchema = Schema.Struct({
  caseStreamVersion: positiveVersion,
  contractKey: label,
  contractRevision: positiveInt,
  policyRevision: label,
  stepId: label,
  capability: label,
  effectiveRisk: Schema.Literal('LOW', 'MEDIUM', 'HIGH'),
  requiredApproval: Schema.Literal('NONE', 'REQUESTER', 'RESOLVER'),
}).pipe(
  Schema.filter(
    (plan) => plan.effectiveRisk !== 'HIGH' || plan.requiredApproval !== 'NONE',
  ),
);
const commandSchema = Schema.Struct({
  ...querySchema.fields,
  commandId: uuid,
  expectedAttemptNumber: positiveInt,
  retryPolicyRevision: label,
  maximumAttempts: positiveInt,
  plan: planSchema,
});
const reviewCoordinates = {
  observedAt: instant,
  supervisionRevision: revision,
  runVersion: revision,
  attemptNumber: positiveInt,
  retryPolicyRevision: label,
  maximumAttempts: positiveInt,
};
const reviewSchema = Schema.Union(
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(true),
    canRetry: Schema.Literal(true),
    reason: Schema.Null,
    plan: planSchema,
  }),
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(false),
    canRetry: Schema.Literal(false),
    reason: Schema.Literal('DISABLED'),
    plan: Schema.NullOr(planSchema),
  }),
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(true),
    canRetry: Schema.Literal(false),
    reason: Schema.Literal(
      'RUN_NOT_FAILED',
      'ATTEMPT_LIMIT_REACHED',
      'PLAN_NOT_READY',
      'PLAN_DENIED',
      'OPERATION_CHANGED',
    ),
    plan: Schema.Null,
  }),
);
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  successorRunId: uuid,
  supervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
  caseStreamVersion: positiveVersion,
  retryPolicyRevision: label,
  sourceAttemptNumber: positiveInt,
  maximumAttempts: positiveInt,
  startedAt: instant,
  recordedAt: instant,
});

export function isValidRetryReviewQuery(query: RunRetryReviewQuery): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

/** Strip caller extras, including nested plan fields, before constructing outbound wire intent. */
export function decodeRetryCommand(
  command: RunRetryCommand,
): RunRetryCommand | undefined {
  const result = Schema.decodeUnknownEither(commandSchema)(command);
  return Either.isRight(result) &&
    result.right.expectedAttemptNumber < result.right.maximumAttempts
    ? result.right
    : undefined;
}

/** Validate related rollout/eligibility fields and strip extras. Stale observations are compared with the current Console by the feature. */
export function decodeRetryReview(body: unknown): RunRetryReview | undefined {
  const decoded = Schema.decodeUnknownEither(reviewSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (
    value.plan !== null &&
    (value.runVersion !== 1 || value.attemptNumber >= value.maximumAttempts)
  )
    return undefined;
  if (
    value.reason === 'ATTEMPT_LIMIT_REACHED' &&
    value.attemptNumber < value.maximumAttempts
  )
    return undefined;
  if (
    value.reason !== null &&
    value.reason !== 'DISABLED' &&
    value.reason !== 'RUN_NOT_FAILED' &&
    (value.runVersion !== 1 ||
      (value.reason !== 'ATTEMPT_LIMIT_REACHED' &&
        value.attemptNumber >= value.maximumAttempts))
  )
    return undefined;
  return value;
}

/** Bind every acknowledged fence and original attempt; a different successor UUID is only a historical identity, never access authority. */
export function decodeRetryReceipt(
  body: unknown,
  command: RunRetryCommand,
): RunRetryReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  const sameId = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase();
  return sameId(value.commandId, command.commandId) &&
    sameId(value.runId, command.runId) &&
    !sameId(value.successorRunId, command.runId) &&
    value.supervisionRevision === command.expectedSupervisionRevision &&
    value.expectedRunVersion === command.expectedRunVersion &&
    value.caseStreamVersion === command.plan.caseStreamVersion &&
    value.retryPolicyRevision === command.retryPolicyRevision &&
    value.sourceAttemptNumber === command.expectedAttemptNumber &&
    value.maximumAttempts === command.maximumAttempts
    ? value
    : undefined;
}
