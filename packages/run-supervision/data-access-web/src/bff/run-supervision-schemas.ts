import { Either, Schema } from 'effect';

import type {
  AssignedRunConsole,
  AssignedRunConsoleQuery,
  AssignedRunPage,
  AssignedRunQuery,
} from '../contracts';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const nonBlank = Schema.String.pipe(
  Schema.filter((value) => value.trim().length > 0),
);
const nonNegativeInteger = Schema.Number.pipe(
  Schema.filter((value) => Number.isSafeInteger(value) && value >= 0),
);
const positiveInteger = Schema.Number.pipe(
  Schema.filter((value) => Number.isSafeInteger(value) && value > 0),
);
const activeState = Schema.Literal(
  'WAITING_FOR_APPROVAL',
  'READY_FOR_AUTHORIZATION',
  'VERIFYING',
  'ACTION_FAILED',
);
const cursor = Schema.Struct({ assignedAt: instant, assignmentId: uuid });
const overview = Schema.Struct({
  runId: uuid,
  caseId: uuid,
  state: activeState,
  stateVersion: nonNegativeInteger,
  stateUpdatedAt: instant,
  assignedAt: instant,
});

const page = Schema.Struct({
  entries: Schema.Array(overview),
  nextCursor: Schema.NullOr(cursor),
});

const consoleSnapshot = Schema.Struct({
  runId: uuid,
  caseId: uuid,
  caseEvidenceStreamVersion: positiveInteger,
  contractKey: nonBlank,
  contractRevision: positiveInteger,
  policyRevision: nonBlank,
  stepId: nonBlank,
  capability: nonBlank,
  effectiveRisk: Schema.Literal('LOW', 'MEDIUM', 'HIGH'),
  requiredApproval: Schema.Literal('NONE', 'REQUESTER', 'RESOLVER'),
  attemptNumber: positiveInteger,
  predecessorRunId: Schema.NullOr(uuid),
  startedRecordedAt: instant,
  state: Schema.Union(
    activeState,
    Schema.Literal('VERIFIED_RESOLVED', 'SUPERSEDED', 'ESCALATED'),
  ),
  stateVersion: nonNegativeInteger,
  stateUpdatedAt: instant,
  assignedAt: instant,
});

const listQuery = Schema.Struct({
  tenantId: uuid,
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.filter(
        (value) => Number.isInteger(value) && value >= 1 && value <= 100,
      ),
    ),
  ),
  cursor: Schema.optional(cursor),
});
const consoleQuery = Schema.Struct({ tenantId: uuid, runId: uuid });

export function isValidListQuery(query: AssignedRunQuery): boolean {
  return Either.isRight(Schema.decodeUnknownEither(listQuery)(query));
}

export function isValidConsoleQuery(query: AssignedRunConsoleQuery): boolean {
  return Either.isRight(Schema.decodeUnknownEither(consoleQuery)(query));
}

/** Decodes only consumed fields; extra server fields remain outside the cached projection. */
export function decodeAssignedRunPage(
  body: unknown,
  query: AssignedRunQuery,
): AssignedRunPage | undefined {
  const decoded = Schema.decodeUnknownEither(page)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (value.entries.length > (query.limit ?? 30)) return undefined;
  if (
    new Set(value.entries.map((entry) => entry.runId.toLowerCase())).size !==
    value.entries.length
  )
    return undefined;
  if (value.nextCursor !== null && value.entries.length === 0) return undefined;
  if (
    value.nextCursor !== null &&
    query.cursor !== undefined &&
    value.nextCursor.assignedAt === query.cursor.assignedAt &&
    value.nextCursor.assignmentId.toLowerCase() ===
      query.cursor.assignmentId.toLowerCase()
  )
    return undefined;
  return value;
}

/** Fail closed when the response names another run, even if its shape is otherwise valid. */
export function decodeAssignedRunConsole(
  body: unknown,
  query: AssignedRunConsoleQuery,
): AssignedRunConsole | undefined {
  const decoded = Schema.decodeUnknownEither(consoleSnapshot)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (value.runId.toLowerCase() !== query.runId.toLowerCase()) return undefined;
  if (value.effectiveRisk === 'HIGH' && value.requiredApproval === 'NONE')
    return undefined;
  if ((value.attemptNumber === 1) !== (value.predecessorRunId === null))
    return undefined;
  if (value.predecessorRunId?.toLowerCase() === value.runId.toLowerCase())
    return undefined;
  return value;
}

/** Java Instant serializes UTC with up to nanosecond precision; do not truncate cursor values. */
function isUtcInstant(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      value,
    )
  )
    return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const date = new Date(parsed);
  return (
    date.getUTCFullYear() === Number(value.slice(0, 4)) &&
    date.getUTCMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getUTCDate() === Number(value.slice(8, 10))
  );
}
