import { Either, Schema } from 'effect';
import type {
  RunRetrySuccessor,
  RunRetrySuccessorQuery,
} from '../retry-successor-contracts';
import { isUtcInstant } from './run-wire-instant';

const revision = Schema.Number.pipe(
  Schema.filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value < Number.MAX_SAFE_INTEGER,
  ),
);
const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
});
const successorSchema = Schema.Struct({
  observedAt: Schema.String.pipe(Schema.filter(isUtcInstant)),
  supervisionRevision: revision,
  successor: Schema.NullOr(
    Schema.Struct({ runId: uuid, supervisionRevision: revision }),
  ),
});

export function validRetrySuccessorQuery(
  query: RunRetrySuccessorQuery,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

/** Match the expected source epoch, reject self-links and strip extras; target epochs need not match or precede the source. */
export function decodeRetrySuccessor(
  body: unknown,
  query: RunRetrySuccessorQuery,
): RunRetrySuccessor | undefined {
  const decoded = Schema.decodeUnknownEither(successorSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (
    value.supervisionRevision !== query.expectedSupervisionRevision ||
    value.successor?.runId.toLowerCase() === query.runId.toLowerCase()
  )
    return undefined;
  return value;
}
