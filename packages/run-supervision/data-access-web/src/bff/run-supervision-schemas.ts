import { Either, Schema } from 'effect';

import type {
  AssignedRunConsole,
  AssignedRunConsoleQuery,
  AssignedRunPage,
  AssignedRunQuery,
} from '../contracts';
import { isConsistentRunHistory } from './run-transition-consistency';
import { isUtcInstant } from './run-wire-instant';
import {
  runVerificationSchema,
  isConsistentVerification,
} from './run-verification-schemas';
import {
  pinnedRunEvidenceSchema,
  isConsistentPinnedEvidence,
} from './run-evidence-schemas';
import {
  approvalReviewSchema,
  isConsistentApprovalReview,
} from './run-approval-schemas';

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
  supervisionRevision: Schema.optionalWith(nonNegativeInteger, { exact: true }),
});

const page = Schema.Struct({
  entries: Schema.Array(overview),
  nextCursor: Schema.NullOr(cursor),
});

// Bound and compare canonical decimal strings without lossy Number coercion or
// admitting arbitrarily large integers into the browser projection.
const elapsedNanoseconds = Schema.String.pipe(
  Schema.pattern(/^(?:0|[1-9][0-9]{0,18})$/),
  Schema.filter((value) => value.length < 19 || value <= '9223372036854775807'),
);
const execution = Schema.Struct({
  stepId: nonBlank,
  capability: nonBlank,
  connector: nonBlank,
  outcome: Schema.Literal('SUCCEEDED', 'FAILED'),
  completedAt: instant,
  recordedAt: instant,
  timing: Schema.NullOr(
    Schema.Struct({
      source: Schema.Literal('ergon.dev/measurement/connector-call/v1'),
      startedAt: instant,
      elapsedNanoseconds,
    }),
  ),
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
  execution: Schema.optionalWith(Schema.NullOr(execution), { exact: true }),
  supervisionRevision: Schema.optionalWith(nonNegativeInteger, { exact: true }),
  handoverSupported: Schema.optionalWith(Schema.Boolean, { exact: true }),
  proofFinalizationSupported: Schema.optionalWith(Schema.Boolean, {
    exact: true,
  }),
  approvalReview: Schema.optionalWith(approvalReviewSchema, { exact: true }),
  pinnedEvidence: Schema.optionalWith(pinnedRunEvidenceSchema, { exact: true }),
  outcomeVerification: Schema.optionalWith(runVerificationSchema, {
    exact: true,
  }),
  transitions: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        sequence: positiveInteger,
        type: Schema.Literal(
          'CAPABILITY_SUCCEEDED',
          'CAPABILITY_FAILED',
          'OUTCOME_PROOF_ACCEPTED',
          'RETRY_STARTED',
          'ESCALATION_REQUESTED',
        ),
        fromState: Schema.Union(
          activeState,
          Schema.Literal('VERIFIED_RESOLVED', 'SUPERSEDED', 'ESCALATED'),
        ),
        toState: Schema.Union(
          activeState,
          Schema.Literal('VERIFIED_RESOLVED', 'SUPERSEDED', 'ESCALATED'),
        ),
        occurredAt: instant,
        recordedAt: instant,
      }),
    ).pipe(Schema.filter((events) => events.length <= 2)),
    { exact: true },
  ),
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
  if (
    (value.supervisionRevision === undefined) !==
    (value.handoverSupported === undefined)
  )
    return undefined;
  if (
    value.supervisionRevision !== undefined &&
    value.supervisionRevision > Number.MAX_SAFE_INTEGER - 1
  )
    return undefined;
  if (
    value.handoverSupported === true &&
    ['VERIFIED_RESOLVED', 'SUPERSEDED', 'ESCALATED'].includes(value.state)
  )
    return undefined;
  if (value.effectiveRisk === 'HIGH' && value.requiredApproval === 'NONE')
    return undefined;
  if ((value.attemptNumber === 1) !== (value.predecessorRunId === null))
    return undefined;
  if (value.predecessorRunId?.toLowerCase() === value.runId.toLowerCase())
    return undefined;
  if (
    value.execution != null &&
    (value.execution.stepId !== value.stepId ||
      value.execution.capability !== value.capability)
  )
    return undefined;
  if (!isConsistentRunHistory(value)) return undefined;
  if (!isConsistentApprovalReview(value)) return undefined;
  if (!isConsistentPinnedEvidence(value)) return undefined;
  if (!isConsistentVerification(value)) return undefined;
  if (
    value.proofFinalizationSupported !== undefined &&
    (value.supervisionRevision === undefined ||
      value.outcomeVerification === undefined)
  )
    return undefined;
  return value;
}
