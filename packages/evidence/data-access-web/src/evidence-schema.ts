import { Either, Schema } from 'effect';
import type {
  DocumentaryClaim,
  EvidenceCursor,
  EvidenceInspection,
  EvidencePage,
  EvidenceReceipt,
  EvidenceReviewIntent,
  EvidenceSelection,
  PendingEvidence,
} from '@ergon/evidence-model';
import { validReviewRationale } from '@ergon/evidence-model';

export const uuid = Schema.UUID;
const kind = Schema.Literal('CLAIM', 'PROCEDURE');
const status = Schema.Literal('PROPOSED', 'ACCEPTED', 'REJECTED');
export const digest = Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/u));
export const compiler = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9][a-z0-9._-]{0,99}$/u),
);
const bounded = (max: number) => Schema.String.pipe(Schema.maxLength(max));
export const integer = Schema.Number.pipe(
  Schema.int(),
  Schema.nonNegative(),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
);
export const time = Schema.String.pipe(
  Schema.pattern(
    /^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$/u,
  ),
  Schema.filter(
    (s) =>
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 19) === s.slice(0, 19),
  ),
);
const target = Schema.Struct({ kind, id: uuid });
const cursor = Schema.Struct({
  beforeRecordedAt: time,
  beforeKind: kind,
  beforeId: uuid,
});
const entry = Schema.Struct({
  kind,
  id: uuid,
  sourceId: uuid,
  digest,
  extractionId: uuid,
  compilerRevision: compiler,
  proposedBy: uuid,
  recordedAt: time,
  label: bounded(256),
  status: Schema.Literal('PROPOSED'),
  version: Schema.Literal(0),
});
const page = Schema.Struct({
  entries: Schema.Array(entry).pipe(Schema.maxItems(20)),
  next: Schema.NullOr(cursor),
});
const citation = Schema.Struct({
  sourceId: uuid,
  digest,
  start: integer,
  endExclusive: integer,
  quote: bounded(65536),
});
export const claim = Schema.Struct({
  id: uuid,
  input: Schema.Struct({
    extractionId: uuid,
    observationIndex: integer,
    property: Schema.Literal(
      'documentation.access.restoration.supported',
      'documentation.access.restoration.requirement',
    ),
    subject: bounded(256),
    scope: bounded(256),
    booleanValue: Schema.NullishOr(Schema.Boolean),
    textValue: Schema.NullishOr(bounded(1000)),
    validFrom: Schema.NullishOr(time),
    validUntil: Schema.NullishOr(time),
  }),
  start: integer,
  endExclusive: integer,
  quote: bounded(65536),
  compilerRevision: compiler,
  proposedBy: uuid,
  recordedAt: time,
  status,
  bindingRule: Schema.Literal('manual-claim-v1'),
});
const operation = Schema.Struct({
  extractionId: uuid,
  compilerRevision: compiler,
  observationIndex: integer,
  jsonPointer: bounded(4096),
  citation,
});
const procedure = Schema.Struct({
  id: uuid,
  title: bounded(256),
  extractionId: uuid,
  compilerRevision: compiler,
  observationIndex: integer,
  citation,
  steps: Schema.Array(
    Schema.Struct({
      position: integer,
      citation,
      operation: Schema.NullOr(operation),
    }),
  ).pipe(Schema.minItems(1), Schema.maxItems(20)),
  proposedBy: uuid,
  recordedAt: time,
  status,
  bindingRule: Schema.Literal('ordered-list-procedure-v1'),
});
// Authority proof identifiers are deliberately absent: strip them before RTK serialization.
const receipt = Schema.Struct({
  target,
  commandId: uuid,
  extractionId: uuid,
  version: Schema.Literal(1),
  decision: Schema.Literal('ACCEPTED', 'REJECTED'),
  rationale: bounded(2000),
  reviewerId: uuid,
  reviewedAt: time,
});
const inspection = Schema.Struct({
  target,
  status,
  version: Schema.Literal(0, 1),
  claim: Schema.NullOr(claim),
  procedure: Schema.NullOr(procedure),
  review: Schema.NullOr(receipt),
});
export function parsePage(
  value: unknown,
  before: EvidenceCursor | null = null,
): EvidencePage | undefined {
  const decoded = Schema.decodeUnknownEither(page)(value);
  if (Either.isLeft(decoded)) return undefined;
  const result = decoded.right;
  let previous =
    before === null
      ? null
      : {
          recordedAt: before.beforeRecordedAt,
          kind: before.beforeKind,
          id: before.beforeId,
        };
  for (const item of result.entries) {
    if (
      !item.label.trim() ||
      (previous !== null && compareCoordinate(previous, item) <= 0)
    )
      return undefined;
    previous = item;
  }
  if (
    new Set(result.entries.map((e) => e.kind + e.id)).size !==
    result.entries.length
  )
    return undefined;
  const last = result.entries.at(-1);
  if (
    result.next !== null &&
    (last === undefined ||
      result.next.beforeId !== last.id ||
      result.next.beforeKind !== last.kind ||
      result.next.beforeRecordedAt !== last.recordedAt)
  )
    return undefined;
  return result;
}
export function validCursor(value: EvidenceCursor | null): boolean {
  return value === null || Schema.is(cursor)(value);
}
function validQuote(value: {
  readonly start: number;
  readonly endExclusive: number;
  readonly quote: string;
}): boolean {
  return (
    Array.from(value.quote).every((ch) => {
      const point = ch.codePointAt(0) ?? 0;
      return point < 0xd800 || point > 0xdfff;
    }) &&
    value.endExclusive <= 65536 &&
    value.endExclusive > value.start &&
    Array.from(value.quote).length === value.endExclusive - value.start &&
    new TextEncoder().encode(value.quote).length <= 65536
  );
}
function matches(
  value: { readonly sourceId: string; readonly digest: string },
  query: EvidenceSelection,
): boolean {
  return (
    value.sourceId === query.proposal.sourceId &&
    value.digest === query.proposal.digest
  );
}
export function parseInspection(
  value: unknown,
  query: EvidenceSelection,
): EvidenceInspection | undefined {
  const decoded = Schema.decodeUnknownEither(inspection)(value);
  if (Either.isLeft(decoded)) return undefined;
  const result = decoded.right;
  const expected = query.proposal;
  if (result.target.kind !== expected.kind || result.target.id !== expected.id)
    return undefined;
  if (
    (result.status === 'PROPOSED') !== (result.version === 0) ||
    (result.version === 0) !== (result.review === null)
  )
    return undefined;
  if (
    result.review !== null &&
    (result.review.target.id !== expected.id ||
      result.review.target.kind !== expected.kind ||
      result.review.extractionId !== expected.extractionId ||
      result.review.decision !== result.status ||
      !validReviewRationale(result.review.rationale))
  )
    return undefined;
  const c = result.claim;
  const p = result.procedure;
  if (expected.kind === 'CLAIM') {
    if (
      c === null ||
      p !== null ||
      c.id !== expected.id ||
      c.status !== result.status ||
      c.proposedBy !== expected.proposedBy ||
      c.recordedAt !== expected.recordedAt ||
      c.compilerRevision !== expected.compilerRevision ||
      c.input.extractionId !== expected.extractionId ||
      !validQuote(c)
    )
      return undefined;
    const checked = parseClaim(c);
    return checked === undefined ? undefined : { ...result, claim: checked };
  }
  if (
    p === null ||
    c !== null ||
    p.id !== expected.id ||
    p.status !== result.status ||
    p.proposedBy !== expected.proposedBy ||
    p.recordedAt !== expected.recordedAt ||
    p.extractionId !== expected.extractionId ||
    p.compilerRevision !== expected.compilerRevision ||
    !matches(p.citation, query) ||
    !validQuote(p.citation) ||
    !p.title.trim()
  )
    return undefined;
  let budget = new TextEncoder().encode(p.citation.quote).length;
  let previousEnd = p.citation.start;
  for (const [index, step] of p.steps.entries()) {
    if (
      step.position !== index + 1 ||
      !validQuote(step.citation) ||
      !matches(step.citation, query) ||
      step.citation.start < previousEnd ||
      step.citation.endExclusive > p.citation.endExclusive ||
      Array.from(p.citation.quote)
        .slice(
          step.citation.start - p.citation.start,
          step.citation.endExclusive - p.citation.start,
        )
        .join('') !== step.citation.quote
    )
      return undefined;
    previousEnd = step.citation.endExclusive;
    budget += new TextEncoder().encode(step.citation.quote).length;
    if (step.operation !== null) {
      if (
        !validQuote(step.operation.citation) ||
        !step.operation.jsonPointer.startsWith('/')
      )
        return undefined;
      budget += new TextEncoder().encode(step.operation.citation.quote).length;
    }
  }
  return budget <= 262144
    ? { ...result, claim: null, procedure: p }
    : undefined;
}
export function parseReceipt(
  value: unknown,
  intent: EvidenceReviewIntent,
): EvidenceReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receipt)(value);
  if (Either.isLeft(decoded)) return undefined;
  const r = decoded.right;
  return r.target.kind === intent.proposal.kind &&
    r.target.id === intent.proposal.id &&
    r.commandId === intent.commandId &&
    r.extractionId === intent.extractionId &&
    r.decision === intent.decision &&
    r.rationale === intent.rationale &&
    r.reviewerId === intent.actorId
    ? r
    : undefined;
}

export function micros(value: string): bigint {
  return (
    BigInt(Date.parse(value.slice(0, 19) + 'Z')) * 1000n +
    BigInt((value.split('.')[1]?.slice(0, -1) ?? '').padEnd(6, '0'))
  );
}

function compareCoordinate(
  left: Pick<PendingEvidence, 'recordedAt' | 'kind' | 'id'>,
  right: Pick<PendingEvidence, 'recordedAt' | 'kind' | 'id'>,
): number {
  const a = micros(left.recordedAt),
    b = micros(right.recordedAt);
  if (a !== b) return a < b ? -1 : 1;
  if (left.kind !== right.kind) return left.kind === 'PROCEDURE' ? 1 : -1;
  const idA = left.id.toLowerCase(),
    idB = right.id.toLowerCase();
  return idA === idB ? 0 : idA < idB ? -1 : 1;
}

export function parseClaim(value: unknown): DocumentaryClaim | undefined {
  const decoded = Schema.decodeUnknownEither(claim)(value);
  if (Either.isLeft(decoded)) return undefined;
  const c = decoded.right;
  if (!validQuote(c)) return undefined;
  const input = c.input;
  const support =
    input.property === 'documentation.access.restoration.supported';
  if (
    !input.subject.trim() ||
    !input.scope.trim() ||
    support !== (input.booleanValue != null) ||
    support === (input.textValue != null) ||
    (input.textValue != null && !input.textValue.trim())
  )
    return undefined;
  if ((input.validFrom == null) !== (input.validUntil == null))
    return undefined;
  if (
    input.validFrom != null &&
    input.validUntil != null &&
    micros(input.validFrom) >= micros(input.validUntil)
  )
    return undefined;
  return {
    ...c,
    input: {
      ...input,
      booleanValue: input.booleanValue ?? null,
      textValue: input.textValue ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
    },
  };
}
