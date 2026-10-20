import { Either, Schema } from 'effect';
import type {
  RunInvocationHistory,
  RunInvocationHistoryQuery,
} from '../invocation-history-contracts';
import { isValidConsoleQuery } from './run-supervision-schemas';
import { isUtcInstant } from './run-wire-instant';

const revision = Schema.Number.pipe(
  Schema.filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value < Number.MAX_SAFE_INTEGER,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const label = Schema.String.pipe(
  Schema.filter((value) => value.trim().length > 0),
);
const nanoseconds = Schema.String.pipe(
  Schema.pattern(/^(?:0|[1-9][0-9]{0,18})$/),
  Schema.filter((value) => value.length < 19 || value <= '9223372036854775807'),
);
const history = Schema.Struct({
  observedAt: instant,
  supervisionRevision: revision,
  entries: Schema.Array(
    Schema.Struct({
      stepId: label,
      capability: label,
      connector: label,
      preparedAt: instant,
      recordedAt: instant,
      completion: Schema.NullOr(
        Schema.Struct({
          outcome: Schema.Literal('SUCCEEDED', 'FAILED', 'UNKNOWN'),
          completedAt: instant,
          recordedAt: instant,
          timing: Schema.Struct({
            source: Schema.Literal('ergon.dev/measurement/connector-call/v1'),
            startedAt: instant,
            elapsedNanoseconds: nanoseconds,
          }),
        }),
      ),
    }),
  ),
  truncated: Schema.Boolean,
});

export function validInvocationHistoryQuery(
  query: RunInvocationHistoryQuery,
): boolean {
  return (
    isValidConsoleQuery(query) &&
    Either.isRight(
      Schema.decodeUnknownEither(revision)(query.expectedSupervisionRevision),
    )
  );
}

/** Validate exact epoch, UTC observations, bounded coverage and exact durations; strip extras. Never impose wall-clock causality or correlate rows with admissions/receipts. */
export function decodeInvocationHistory(
  body: unknown,
  query: RunInvocationHistoryQuery,
): RunInvocationHistory | undefined {
  const decoded = Schema.decodeUnknownEither(history)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  return value.supervisionRevision === query.expectedSupervisionRevision &&
    value.entries.length <= 100 &&
    (!value.truncated || value.entries.length === 100)
    ? value
    : undefined;
}
