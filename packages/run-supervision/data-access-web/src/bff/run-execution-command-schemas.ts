import { Either, Schema } from 'effect';
import type {
  RunExecutionCommand,
  RunExecutionReceipt,
  RunExecutionReview,
  RunExecutionReviewQuery,
} from '../execution-command-contracts';
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
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const coordinates = {
  tenantId: uuid,
  runId: uuid,
  commandId: uuid,
  expectedSupervisionRevision: revision,
  expectedRunVersion: Schema.Literal(0),
};
const commandSchema = Schema.Union(
  Schema.Struct({
    ...coordinates,
    kind: Schema.Literal('execute'),
    requestId: uuid,
    decisionId: uuid,
  }),
  Schema.Struct({
    ...coordinates,
    kind: Schema.Literal('resume'),
    attemptId: uuid,
  }),
);
const reviewSchema = Schema.Struct({
  supported: Schema.Boolean,
  observedAt: instant,
  supervisionRevision: revision,
  runVersion: revision,
  requestId: Schema.NullOr(uuid),
  decisionId: Schema.NullOr(uuid),
  commandId: Schema.NullOr(uuid),
  canExecute: Schema.Boolean,
  canResume: Schema.Boolean,
});
const receiptCoordinates = {
  commandId: uuid,
  attemptId: uuid,
  runId: uuid,
  admittedRecordedAt: instant,
};
const receiptSchema = Schema.Union(
  Schema.Struct({
    ...receiptCoordinates,
    status: Schema.Literal('INCOMPLETE', 'RESULT_RECORDED'),
    outcome: Schema.Null,
    resultingState: Schema.Null,
    runSequence: Schema.Null,
    completedAt: Schema.Null,
    resultRecordedAt: Schema.Null,
  }),
  Schema.Struct({
    ...receiptCoordinates,
    status: Schema.Literal('COMPLETED'),
    outcome: Schema.Literal('SUCCEEDED'),
    resultingState: Schema.Literal('VERIFYING'),
    runSequence: Schema.Literal(1),
    completedAt: instant,
    resultRecordedAt: instant,
  }),
  Schema.Struct({
    ...receiptCoordinates,
    status: Schema.Literal('COMPLETED'),
    outcome: Schema.Literal('FAILED'),
    resultingState: Schema.Literal('ACTION_FAILED'),
    runSequence: Schema.Literal(1),
    completedAt: instant,
    resultRecordedAt: instant,
  }),
);

export function isValidExecutionCommand(command: RunExecutionCommand): boolean {
  return Either.isRight(Schema.decodeUnknownEither(commandSchema)(command));
}

export function isValidExecutionReviewQuery(
  query: RunExecutionReviewQuery,
): boolean {
  return Either.isRight(
    Schema.decodeUnknownEither(
      Schema.Struct({
        tenantId: uuid,
        runId: uuid,
        expectedSupervisionRevision: revision,
        expectedRunVersion: Schema.Literal(0),
      }),
    )(query),
  );
}

/** Validate related eligibility fields, not just wire types. Stale but well-formed epochs are compared by the feature before confirming. */
export function decodeExecutionReview(
  body: unknown,
): RunExecutionReview | undefined {
  const decoded = Schema.decodeUnknownEither(reviewSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const review = decoded.right;
  if (!review.supported && (review.canExecute || review.canResume))
    return undefined;
  if (review.decisionId !== null && review.requestId === null) return undefined;
  if (
    review.canExecute &&
    (review.runVersion !== 0 ||
      review.requestId === null ||
      review.decisionId === null ||
      review.commandId !== null)
  )
    return undefined;
  if (
    review.canResume &&
    (review.runVersion !== 0 || review.commandId === null)
  )
    return undefined;
  return review;
}

/** Bind status/HTTP, exact intent identities and terminal outcome/state. Strip unconsumed private fields; never infer result from HTTP alone. */
export function decodeExecutionReceipt(
  body: unknown,
  command: RunExecutionCommand,
  status: number,
): RunExecutionReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const receipt = decoded.right;
  const sameId = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase();
  const attemptId =
    command.kind === 'execute' ? command.commandId : command.attemptId;
  return sameId(receipt.commandId, command.commandId) &&
    sameId(receipt.runId, command.runId) &&
    sameId(receipt.attemptId, attemptId) &&
    status === (receipt.status === 'COMPLETED' ? 200 : 202)
    ? receipt
    : undefined;
}
