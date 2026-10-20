import { Either, Schema } from 'effect';
import type {
  RunExecutionHistory,
  RunExecutionHistoryQuery,
} from '../execution-history-contracts';
import { compareUtcInstants, isUtcInstant } from './run-wire-instant';

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
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
});
const historySchema = Schema.Struct({
  observedAt: instant,
  supervisionRevision: revision,
  commandRecorded: Schema.Boolean,
  entries: Schema.Array(
    Schema.Struct({
      kind: Schema.Literal('INITIAL', 'RECOVERY'),
      supervisionRevision: revision,
      admittedAt: instant,
      recordedAt: instant,
    }),
  ),
  truncated: Schema.Boolean,
});

export function validExecutionHistoryQuery(
  query: RunExecutionHistoryQuery,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

/**
 * Validate the bounded recording-order projection and exact expected epoch; strip
 * private extras before caching. Admission times may backstep and INITIAL need not
 * be first/present. Authorization observation and audit snapshot are not one clock.
 */
export function decodeExecutionHistory(
  body: unknown,
  query: RunExecutionHistoryQuery,
): RunExecutionHistory | undefined {
  const result = Schema.decodeUnknownEither(historySchema)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  if (
    value.supervisionRevision !== query.expectedSupervisionRevision ||
    value.entries.length > 100 ||
    (value.truncated && value.entries.length !== 100)
  )
    return undefined;
  if (
    value.commandRecorded
      ? value.entries.length === 0
      : value.entries.length !== 0 || value.truncated
  )
    return undefined;
  if (value.entries.filter((entry) => entry.kind === 'INITIAL').length > 1)
    return undefined;
  if (
    value.entries.some((entry, index) => {
      const previous = value.entries[index - 1];
      return (
        previous !== undefined &&
        compareUtcInstants(previous.recordedAt, entry.recordedAt) > 0
      );
    })
  )
    return undefined;
  return value;
}
