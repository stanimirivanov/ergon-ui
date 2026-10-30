import { Either, Schema } from 'effect';
import {
  canonicalEvidenceIds,
  validReviewRationale,
  type ContradictionAssessment,
  type DocumentaryAdjudication,
  type DocumentaryBundle,
  type KnowledgeQuery,
  type AdjudicationIntent,
  type BundleIntent,
} from '@ergon/evidence-model';
import {
  uuid,
  digest,
  compiler,
  integer,
  time,
  claim,
  parseClaim,
  micros,
} from './evidence-schema';
const label = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256));
const revision = integer.pipe(Schema.greaterThan(0));
const ids = Schema.Array(uuid).pipe(Schema.minItems(1), Schema.maxItems(20));
const comparison = Schema.Literal(
  'DISJOINT_VALIDITY',
  'COMPATIBLE',
  'CONFLICT',
  'UNDETERMINED',
);
const assessment = Schema.Struct({
  algorithm: Schema.Literal('documentary-contradictions-v1'),
  property: label,
  subject: label,
  scope: label,
  revision,
  state: Schema.Literal(
    'CONFLICT',
    'UNDETERMINED',
    'INSUFFICIENT_CANDIDATES',
    'NO_DETECTED_CONFLICT',
  ),
  hasUndetermined: Schema.Boolean,
  candidates: Schema.Array(
    Schema.Struct({
      id: uuid,
      reviewCommandId: uuid,
      sourceId: uuid,
      digest,
      claim,
    }),
  ).pipe(Schema.minItems(1), Schema.maxItems(20)),
  findings: Schema.Array(
    Schema.Struct({ left: uuid, right: uuid, comparison }),
  ).pipe(Schema.maxItems(190)),
});
const adjudication = Schema.Struct({
  id: uuid,
  anchorId: uuid,
  choice: Schema.Literal('PREFER_CLAIM', 'DEFER'),
  selectedClaimId: Schema.NullOr(uuid),
  rationale: Schema.String.pipe(Schema.maxLength(2000)),
  reviewerId: uuid,
  adjudicatedAt: time,
  current: Schema.Boolean,
  assessment,
});
const set = Schema.Struct({
  property: Schema.Literal('SUPPORT', 'REQUIREMENT'),
  subject: label,
  scope: label,
  revision,
  candidateIds: ids,
  reviewCommandIds: ids,
  findingCodes: Schema.Array(
    Schema.Literal('DISJOINT_VALIDITY', 'COMPATIBLE', 'CONFLICT'),
  ).pipe(Schema.maxItems(190)),
  adjudicationId: Schema.NullOr(uuid),
});
const bundle = Schema.Struct({
  id: uuid,
  sha256: digest,
  publishedBy: uuid,
  recordedAt: time,
  manifest: Schema.Struct({
    schema: Schema.Literal('ergon.dev/evidence-bundle/v1'),
    tenantId: uuid,
    assessedAt: time,
    proposals: Schema.Array(
      Schema.Struct({
        kind: Schema.Literal('CLAIM', 'PROCEDURE'),
        id: uuid,
        sourceId: uuid,
        digest,
        extractionId: uuid,
        compilerRevision: compiler,
        reviewCommandId: uuid,
        selected: Schema.Boolean,
      }),
    ).pipe(Schema.minItems(1), Schema.maxItems(420)),
    sources: Schema.Array(Schema.Struct({ sourceId: uuid, digest })).pipe(
      Schema.minItems(1),
      Schema.maxItems(420),
    ),
    claimSets: Schema.Array(set).pipe(Schema.maxItems(20)),
  }),
});
export function parseAssessment(
  value: unknown,
  anchorId: string,
): ContradictionAssessment | undefined {
  const decoded = Schema.decodeUnknownEither(assessment)(value);
  if (Either.isLeft(decoded)) return undefined;
  const a = decoded.right;
  if (
    !canonicalEvidenceIds(a.candidates.map((c) => c.id)) ||
    !a.candidates.some((c) => c.id === anchorId) ||
    new Set(a.candidates.map((c) => c.reviewCommandId)).size !==
      a.candidates.length
  )
    return undefined;
  const candidates: ContradictionAssessment['candidates'][number][] = [];
  for (const c of a.candidates) {
    const checked = parseClaim(c.claim);
    if (
      checked === undefined ||
      checked.status !== 'ACCEPTED' ||
      checked.id !== c.id ||
      checked.input.property !== a.property ||
      checked.input.subject !== a.subject ||
      checked.input.scope !== a.scope ||
      !a.subject.trim() ||
      !a.scope.trim()
    )
      return undefined;
    candidates.push({ ...c, claim: checked });
  }
  let index = 0;
  for (const [i, left] of candidates.entries())
    for (const right of candidates.slice(i + 1)) {
      const finding = a.findings[index++];
      if (
        finding?.left !== left.id ||
        finding.right !== right.id ||
        finding.comparison !== compare(left.claim, right.claim)
      )
        return undefined;
    }
  if (a.findings.length !== index) return undefined;
  const codes = a.findings.map((f) => f.comparison);
  const expected = codes.includes('CONFLICT')
    ? 'CONFLICT'
    : codes.includes('UNDETERMINED')
      ? 'UNDETERMINED'
      : codes.length === 0
        ? 'INSUFFICIENT_CANDIDATES'
        : 'NO_DETECTED_CONFLICT';
  return a.state === expected &&
    a.hasUndetermined === codes.includes('UNDETERMINED')
    ? { ...a, candidates }
    : undefined;
}
function compare(
  left: ContradictionAssessment['candidates'][number]['claim'],
  right: ContradictionAssessment['candidates'][number]['claim'],
): string {
  const a = left.input,
    b = right.input;
  if (
    a.validFrom === null ||
    a.validUntil === null ||
    b.validFrom === null ||
    b.validUntil === null
  )
    return 'UNDETERMINED';
  if (
    micros(a.validFrom) >= micros(b.validUntil) ||
    micros(b.validFrom) >= micros(a.validUntil)
  )
    return 'DISJOINT_VALIDITY';
  if (a.booleanValue === b.booleanValue && a.textValue === b.textValue)
    return 'COMPATIBLE';
  return a.booleanValue !== null && b.booleanValue !== null
    ? 'CONFLICT'
    : 'UNDETERMINED';
}
export function parseAdjudication(
  value: unknown,
  q: KnowledgeQuery,
  intent?: AdjudicationIntent,
): DocumentaryAdjudication | undefined {
  const decoded = Schema.decodeUnknownEither(adjudication)(value);
  if (Either.isLeft(decoded)) return undefined;
  const a = decoded.right,
    checked = parseAssessment(a.assessment, a.anchorId);
  if (
    a.id !== q.id ||
    checked === undefined ||
    !validReviewRationale(a.rationale) ||
    (a.choice === 'PREFER_CLAIM') !== (a.selectedClaimId !== null) ||
    (a.selectedClaimId !== null &&
      !checked.candidates.some((c) => c.id === a.selectedClaimId)) ||
    checked.candidates.length < 2 ||
    !checked.findings.some(
      (f) => f.comparison === 'CONFLICT' || f.comparison === 'UNDETERMINED',
    )
  )
    return undefined;
  if (
    intent !== undefined &&
    (a.anchorId !== intent.anchorId ||
      a.choice !== intent.choice ||
      a.selectedClaimId !== intent.selectedClaimId ||
      a.rationale !== intent.rationale ||
      a.reviewerId !== intent.actorId ||
      checked.revision !== intent.expectedRevision ||
      checked.candidates.map((c) => c.id).join() !== intent.candidateIds.join())
  )
    return undefined;
  return { ...a, assessment: checked };
}
export function parseBundle(
  value: unknown,
  q: KnowledgeQuery,
  intent?: BundleIntent,
): DocumentaryBundle | undefined {
  const decoded = Schema.decodeUnknownEither(bundle)(value);
  if (Either.isLeft(decoded)) return undefined;
  const b = decoded.right,
    m = b.manifest;
  if (
    b.id !== q.id ||
    m.tenantId !== q.tenantId ||
    micros(m.assessedAt) > micros(b.recordedAt)
  )
    return undefined;
  const refs = m.proposals.map((p) => p.kind + p.id),
    sources = m.sources.map((s) => s.sourceId + s.digest);
  if (
    !ordered(refs) ||
    !ordered(sources) ||
    m.proposals.filter((p) => p.selected).length < 1 ||
    m.proposals.filter((p) => p.selected).length > 20 ||
    m.proposals.some(
      (p) =>
        !sources.includes(p.sourceId + p.digest) ||
        (p.kind === 'PROCEDURE' && !p.selected),
    )
  )
    return undefined;
  const covered: string[] = [];
  if (
    !ordered(
      m.claimSets.map(
        (s) => s.property + '\u0000' + s.subject + '\u0000' + s.scope,
      ),
    )
  )
    return undefined;
  for (const s of m.claimSets) {
    if (
      !canonicalEvidenceIds(s.candidateIds) ||
      new Set(s.reviewCommandIds).size !== s.candidateIds.length ||
      s.reviewCommandIds.length !== s.candidateIds.length ||
      s.findingCodes.length !==
        (s.candidateIds.length * (s.candidateIds.length - 1)) / 2 ||
      s.findingCodes.includes('CONFLICT') !== (s.adjudicationId !== null)
    )
      return undefined;
    const selected = m.proposals.filter(
      (p) => p.kind === 'CLAIM' && s.candidateIds.includes(p.id) && p.selected,
    );
    if (
      selected.length === 0 ||
      (s.adjudicationId !== null && selected.length !== 1)
    )
      return undefined;
    for (const [i, id] of s.candidateIds.entries()) {
      if (
        !m.proposals.some(
          (p) =>
            p.kind === 'CLAIM' &&
            p.id === id &&
            p.reviewCommandId === s.reviewCommandIds[i],
        )
      )
        return undefined;
      covered.push(id);
    }
  }
  if (
    new Set(covered).size !== covered.length ||
    covered.length !== m.proposals.filter((p) => p.kind === 'CLAIM').length
  )
    return undefined;
  if (
    intent !== undefined &&
    (b.publishedBy !== intent.actorId ||
      m.proposals
        .filter((p) => p.selected && p.kind === 'CLAIM')
        .map((p) => p.id)
        .join() !== intent.claims.join() ||
      m.proposals
        .filter((p) => p.selected && p.kind === 'PROCEDURE')
        .map((p) => p.id)
        .join() !== intent.procedures.join() ||
      m.claimSets.length !== intent.claimSets.length ||
      intent.claimSets.some(
        (s) =>
          !m.claimSets.some(
            (g) =>
              g.revision === s.revision &&
              g.adjudicationId === s.adjudicationId &&
              g.candidateIds.includes(s.anchorId) &&
              g.candidateIds.join() === s.candidateIds.join(),
          ),
      ))
  )
    return undefined;
  return b;
}
function ordered(values: readonly string[]): boolean {
  return values.every((v, i) => i === 0 || (values[i - 1] ?? '') < v);
}
