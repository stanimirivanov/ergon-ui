import { Either, Schema } from 'effect';
import type {
  RunEscalationCommand,
  RunEscalationReceipt,
  RunEscalationReview,
  RunEscalationReviewQuery,
} from '../escalation-contracts';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const revision = Schema.Number.pipe(
  Schema.filter(
    (v) => Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER,
  ),
);
const positiveInt = Schema.Number.pipe(
  Schema.filter((v) => Number.isInteger(v) && v > 0 && v <= 2_147_483_647),
);
const label = Schema.String.pipe(
  Schema.filter((v) => v.trim().length > 0 && v.length <= 200),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
});
const commandSchema = Schema.Struct({
  ...querySchema.fields,
  commandId: uuid,
  sourceAttemptNumber: positiveInt,
  retryPolicyRevision: label,
  maximumAttempts: positiveInt,
  reason: Schema.Literal('RETRY_ATTEMPT_LIMIT_REACHED'),
});
const reviewCoordinates = {
  observedAt: instant,
  supervisionRevision: revision,
  runVersion: revision,
  attemptNumber: positiveInt,
  retryPolicyRevision: label,
  maximumAttempts: positiveInt,
  followUpQueueKey: Schema.Literal('access-restoration'),
};
const reviewSchema = Schema.Union(
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(false),
    canEscalate: Schema.Literal(false),
    reason: Schema.Literal('DISABLED'),
  }),
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(true),
    canEscalate: Schema.Literal(false),
    reason: Schema.Literal('RUN_NOT_FAILED', 'RETRY_BUDGET_AVAILABLE'),
  }),
  Schema.Struct({
    ...reviewCoordinates,
    supported: Schema.Literal(true),
    canEscalate: Schema.Literal(true),
    reason: Schema.Literal('RETRY_ATTEMPT_LIMIT_REACHED'),
  }),
);
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  supervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
  sourceAttemptNumber: positiveInt,
  retryPolicyRevision: label,
  maximumAttempts: positiveInt,
  reason: Schema.Literal('RETRY_ATTEMPT_LIMIT_REACHED'),
  escalationEventId: uuid,
  followUpWorkItemId: uuid,
  followUpQueueKey: Schema.Literal('access-restoration'),
  creationStatus: Schema.Literal('OPEN'),
  requestedAt: instant,
  recordedAt: instant,
});

export function isValidEscalationReviewQuery(
  query: RunEscalationReviewQuery,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

/** Strip caller extras and reject a non-exhausted tuple before CSRF or HTTP work. */
export function decodeEscalationCommand(
  command: RunEscalationCommand,
): RunEscalationCommand | undefined {
  const result = Schema.decodeUnknownEither(commandSchema)(command);
  return Either.isRight(result) &&
    result.right.sourceAttemptNumber >= result.right.maximumAttempts
    ? result.right
    : undefined;
}

/** Validate the backend's ordered eligibility rules; DISABLED/terminal observations cannot authorize confirmation. */
export function decodeEscalationReview(
  body: unknown,
): RunEscalationReview | undefined {
  const result = Schema.decodeUnknownEither(reviewSchema)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  if (!value.supported) return value;
  const exhausted = value.attemptNumber >= value.maximumAttempts;
  if (value.reason === 'RUN_NOT_FAILED') return value;
  if (value.runVersion !== 1) return undefined;
  return value.reason === 'RETRY_ATTEMPT_LIMIT_REACHED'
    ? exhausted
      ? value
      : undefined
    : !exhausted
      ? value
      : undefined;
}

/** Bind every acknowledged fence; IDs acknowledge historical creation only and cannot grant current access. Unconsumed private attribution is discarded. */
export function decodeEscalationReceipt(
  body: unknown,
  command: RunEscalationCommand,
): RunEscalationReceipt | undefined {
  const result = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  return value.commandId.toLowerCase() === command.commandId.toLowerCase() &&
    value.runId.toLowerCase() === command.runId.toLowerCase() &&
    value.supervisionRevision === command.expectedSupervisionRevision &&
    value.expectedRunVersion === command.expectedRunVersion &&
    value.sourceAttemptNumber === command.sourceAttemptNumber &&
    value.retryPolicyRevision === command.retryPolicyRevision &&
    value.maximumAttempts === command.maximumAttempts &&
    value.reason === command.reason
    ? value
    : undefined;
}
