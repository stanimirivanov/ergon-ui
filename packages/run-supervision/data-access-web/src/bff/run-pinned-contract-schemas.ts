import { Either, Schema } from 'effect';
import type {
  RunPinnedContract,
  RunPinnedContractQuery,
} from '../pinned-contract-contracts';
import { isValidConsoleQuery } from './run-supervision-schemas';
import { isUtcInstant } from './run-wire-instant';

const identifier = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9][a-z0-9-]{0,99}$/),
);
const qualified = Schema.String.pipe(
  Schema.maxLength(200),
  Schema.pattern(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/),
);
const revision = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 2147483647),
);
const epoch = Schema.Number.pipe(
  Schema.filter(
    (v) => Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const condition = Schema.Struct({
  fact: qualified,
  equals: Schema.String.pipe(
    Schema.maxLength(200),
    Schema.filter((v) => v.trim().length > 0),
  ),
});
const step = Schema.Struct({
  id: identifier,
  capability: qualified,
  risk: Schema.Literal('LOW', 'MEDIUM', 'HIGH'),
  approval: Schema.Literal('NONE', 'REQUESTER', 'RESOLVER'),
}).pipe(Schema.filter((v) => v.risk !== 'HIGH' || v.approval !== 'NONE'));
const queryCoordinates = Schema.Struct({
  expectedSupervisionRevision: epoch,
  contractKey: identifier,
  contractRevision: revision,
  stepId: identifier,
  capability: qualified,
});
const pinnedContract = Schema.Struct({
  runId: Schema.String,
  supervisionRevision: epoch,
  observedAt: instant,
  pinnedStepId: identifier,
  contractRecordedAt: instant,
  contract: Schema.Struct({
    schema: Schema.Literal('ergon.dev/resolution-contract/v1alpha1'),
    key: identifier,
    revision,
    applicability: condition,
    requiredEvidence: Schema.Array(qualified).pipe(
      Schema.minItems(1),
      Schema.maxItems(50),
    ),
    steps: Schema.Array(step).pipe(Schema.minItems(1), Schema.maxItems(50)),
    outcomeProof: condition,
  }),
});

export function validPinnedContractQuery(
  query: RunPinnedContractQuery,
): boolean {
  return (
    isValidConsoleQuery(query) &&
    Either.isRight(Schema.decodeUnknownEither(queryCoordinates)(query))
  );
}

/** Strip extras and validate the exact run/epoch/pin plus normalized domain invariants. Never equate declared and effective safeguards or impose UTC causality. */
export function decodePinnedContract(
  body: unknown,
  query: RunPinnedContractQuery,
): RunPinnedContract | undefined {
  const decoded = Schema.decodeUnknownEither(pinnedContract)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right,
    definition = value.contract;
  const pinned = definition.steps.find((s) => s.id === value.pinnedStepId);
  return value.runId === query.runId &&
    value.supervisionRevision === query.expectedSupervisionRevision &&
    definition.key === query.contractKey &&
    definition.revision === query.contractRevision &&
    value.pinnedStepId === query.stepId &&
    pinned?.capability === query.capability &&
    new Set(definition.steps.map((s) => s.id)).size ===
      definition.steps.length &&
    new Set(definition.requiredEvidence).size ===
      definition.requiredEvidence.length &&
    definition.requiredEvidence.includes(definition.applicability.fact)
    ? value
    : undefined;
}
