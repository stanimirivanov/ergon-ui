import { Either, Schema } from 'effect';
import type {
  RunPinnedReadiness,
  RunPinnedReadinessQuery,
} from '../pinned-readiness-contracts';
import { pinnedEvidenceFactSchema } from './run-evidence-schemas';
import { isValidConsoleQuery } from './run-supervision-schemas';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const version = Schema.Number.pipe(
  Schema.filter((v) => Number.isSafeInteger(v) && v > 0),
);
const epoch = Schema.Number.pipe(
  Schema.filter(
    (v) => Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER,
  ),
);
const key = Schema.String.pipe(Schema.pattern(/^[a-z0-9][a-z0-9-]{0,99}$/));
const revision = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 2147483647),
);
const factName = Schema.String.pipe(
  Schema.maxLength(200),
  Schema.pattern(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/),
);
const exactValue = Schema.String.pipe(
  Schema.maxLength(200),
  Schema.filter((v) => v.trim().length > 0),
);
const applicability = Schema.Struct({
  fact: Schema.Literal('account.access.state'),
  expectedValue: exactValue,
  actualValue: exactValue,
});
const shape = Schema.Struct({
  runId: uuid,
  caseId: uuid,
  caseStreamVersion: version,
  supervisionRevision: epoch,
  observedAt: Schema.String.pipe(Schema.filter(isUtcInstant)),
  contractKey: key,
  contractRevision: revision,
  evaluator: Schema.Literal('ergon.dev/evaluation/pinned-readiness/v1'),
  status: Schema.Literal('READY', 'NOT_APPLICABLE', 'WAITING_FOR_EVIDENCE'),
  missingEvidence: Schema.Array(factName).pipe(Schema.maxItems(50)),
  applicability: Schema.NullOr(applicability),
  selectedEvidence: Schema.Array(pinnedEvidenceFactSchema).pipe(
    Schema.maxItems(1),
  ),
});
const coordinates = Schema.Struct({
  caseId: uuid,
  caseStreamVersion: version,
  expectedSupervisionRevision: epoch,
  contractKey: key,
  contractRevision: revision,
});

export function validPinnedReadinessQuery(
  query: RunPinnedReadinessQuery,
): boolean {
  return (
    isValidConsoleQuery(query) &&
    Either.isRight(Schema.decodeUnknownEither(coordinates)(query))
  );
}

/** Strip extras and reject the complete response on mismatched pins or v1 status/provenance contradictions. Never infer completeness from the bounded history or impose timestamp causality. */
export function decodePinnedReadiness(
  body: unknown,
  query: RunPinnedReadinessQuery,
): RunPinnedReadiness | undefined {
  const decoded = Schema.decodeUnknownEither(shape)(body);
  if (Either.isLeft(decoded)) return undefined;
  const value = decoded.right;
  if (
    value.runId.toLowerCase() !== query.runId.toLowerCase() ||
    value.caseId.toLowerCase() !== query.caseId.toLowerCase() ||
    value.caseStreamVersion !== query.caseStreamVersion ||
    value.supervisionRevision !== query.expectedSupervisionRevision ||
    value.contractKey !== query.contractKey ||
    value.contractRevision !== query.contractRevision ||
    new Set(value.missingEvidence).size !== value.missingEvidence.length
  )
    return undefined;
  const fact = value.selectedEvidence[0];
  if (
    fact !== undefined &&
    (fact.streamVersion > value.caseStreamVersion ||
      fact.source.streamVersion >= fact.streamVersion ||
      fact.source.reference !== fact.accountReference ||
      value.missingEvidence.includes(fact.property))
  )
    return undefined;
  if (value.status === 'WAITING_FOR_EVIDENCE') {
    return value.applicability === null && value.missingEvidence.length > 0
      ? { ...value, status: value.status, applicability: null }
      : undefined;
  }
  const condition = value.applicability;
  if (
    value.missingEvidence.length !== 0 ||
    condition === null ||
    fact === undefined ||
    condition.fact !== fact.property ||
    condition.actualValue !== fact.value ||
    (condition.expectedValue === condition.actualValue) !==
      (value.status === 'READY')
  )
    return undefined;
  return { ...value, status: value.status, applicability: condition };
}
