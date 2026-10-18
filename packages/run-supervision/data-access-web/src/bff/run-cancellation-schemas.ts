import { Either, Schema } from 'effect';
import type {
  RunCancellationCommand,
  RunCancellationReceipt,
  RunCancellationReview,
  RunCancellationReviewQuery,
} from '../cancellation-contracts';
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
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
  expectedRunVersion: Schema.Literal(0),
});
const commandSchema = Schema.Struct({ ...querySchema.fields, commandId: uuid });
const coordinates = {
  observedAt: instant,
  supervisionRevision: revision,
  runVersion: revision,
};
const reviewSchema = Schema.Union(
  Schema.Struct({
    ...coordinates,
    supported: Schema.Literal(false),
    canCancel: Schema.Literal(false),
    reason: Schema.Literal('DISABLED'),
  }),
  Schema.Struct({
    ...coordinates,
    supported: Schema.Literal(true),
    canCancel: Schema.Literal(false),
    reason: Schema.Literal(
      'RUN_NOT_UNTOUCHED',
      'AUTHORIZATION_OR_EXECUTION_RECORDED',
    ),
  }),
  Schema.Struct({
    ...coordinates,
    supported: Schema.Literal(true),
    canCancel: Schema.Literal(true),
    reason: Schema.Literal('ELIGIBLE'),
  }),
);
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  supervisionRevision: revision,
  expectedRunVersion: Schema.Literal(0),
  reason: Schema.Literal('OPERATOR_REQUESTED'),
  cancelledAt: instant,
  recordedAt: instant,
});

export function isValidCancellationReviewQuery(
  query: RunCancellationReviewQuery,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

/** Strip caller extras before CSRF/HTTP; the actor, reason and time are server-owned. */
export function decodeCancellationCommand(
  command: RunCancellationCommand,
): RunCancellationCommand | undefined {
  const decoded = Schema.decodeUnknownEither(commandSchema)(command);
  return Either.isRight(decoded) ? decoded.right : undefined;
}

/** Eligibility parity is mandatory; durable authorization can disqualify even version-zero runs. */
export function decodeCancellationReview(
  body: unknown,
): RunCancellationReview | undefined {
  const decoded = Schema.decodeUnknownEither(reviewSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (
    value.reason !== 'DISABLED' &&
    value.reason !== 'RUN_NOT_UNTOUCHED' &&
    value.runVersion !== 0
  )
    return undefined;
  return value;
}

/** Bind every acknowledged fence without inferring access or ordering wall-clock observations. */
export function decodeCancellationReceipt(
  body: unknown,
  command: RunCancellationCommand,
): RunCancellationReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  return value.commandId.toLowerCase() === command.commandId.toLowerCase() &&
    value.runId.toLowerCase() === command.runId.toLowerCase() &&
    value.supervisionRevision === command.expectedSupervisionRevision &&
    value.expectedRunVersion === command.expectedRunVersion
    ? value
    : undefined;
}
