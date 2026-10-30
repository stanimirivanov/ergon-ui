import type {
  ContradictionAssessment,
  DocumentaryAdjudication,
  DocumentaryBundle,
  AdjudicationIntent,
  BundleIntent,
} from '@ergon/evidence-model';
import { actorId, tenantId, proposal, inspection } from './fixtures';
const baseClaim = inspection.claim;
if (baseClaim === null) throw new Error('Fixture requires a claim');
export const anchor = proposal.id;
export const second = '77777777-7777-4777-8777-777777777777';
export const decisionId = '88888888-8888-4888-8888-888888888888';
export const bundleId = '99999999-9999-4999-8999-999999999999';
export const assessment: ContradictionAssessment = {
  algorithm: 'documentary-contradictions-v1',
  property: 'documentation.access.restoration.supported',
  subject: 'recovery',
  scope: 'staff',
  revision: 2,
  state: 'CONFLICT',
  hasUndetermined: false,
  candidates: [anchor, second].map((id, i) => ({
    id,
    reviewCommandId: i === 0 ? decisionId : bundleId,
    sourceId: proposal.sourceId,
    digest: proposal.digest,
    claim: {
      ...baseClaim,
      id,
      status: 'ACCEPTED',
      input: { ...baseClaim.input, booleanValue: i === 0 },
    },
  })),
  findings: [{ left: anchor, right: second, comparison: 'CONFLICT' }],
};
export const adjudicationIntent: AdjudicationIntent = {
  tenantId,
  actorId,
  id: decisionId,
  anchorId: anchor,
  expectedRevision: 2,
  candidateIds: [anchor, second],
  choice: 'PREFER_CLAIM',
  selectedClaimId: anchor,
  rationale: 'Prefer verified recovery guidance',
};
export const adjudication: DocumentaryAdjudication = {
  id: decisionId,
  anchorId: anchor,
  choice: adjudicationIntent.choice,
  selectedClaimId: anchor,
  rationale: adjudicationIntent.rationale,
  reviewerId: actorId,
  adjudicatedAt: '2026-10-29T12:00:01Z',
  current: true,
  assessment,
};
export const publication: BundleIntent = {
  tenantId,
  actorId,
  id: bundleId,
  claims: [anchor],
  procedures: [],
  claimSets: [
    {
      anchorId: anchor,
      revision: 2,
      candidateIds: [anchor, second],
      adjudicationId: decisionId,
    },
  ],
};
export const bundle: DocumentaryBundle = {
  id: bundleId,
  sha256: 'b'.repeat(64),
  publishedBy: actorId,
  recordedAt: '2026-10-29T12:00:03Z',
  manifest: {
    schema: 'ergon.dev/evidence-bundle/v1',
    tenantId,
    assessedAt: '2026-10-29T12:00:02Z',
    proposals: assessment.candidates.map((c, i) => ({
      kind: 'CLAIM',
      id: c.id,
      sourceId: c.sourceId,
      digest: c.digest,
      extractionId: c.claim.input.extractionId,
      compilerRevision: c.claim.compilerRevision,
      reviewCommandId: c.reviewCommandId,
      selected: i === 0,
    })),
    sources: [{ sourceId: proposal.sourceId, digest: proposal.digest }],
    claimSets: [
      {
        property: 'SUPPORT',
        subject: 'recovery',
        scope: 'staff',
        revision: 2,
        candidateIds: [anchor, second],
        reviewCommandIds: assessment.candidates.map((c) => c.reviewCommandId),
        findingCodes: ['CONFLICT'],
        adjudicationId: decisionId,
      },
    ],
  },
};
