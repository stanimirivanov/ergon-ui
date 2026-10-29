import type {
  EvidenceInspection,
  EvidencePage,
  EvidenceReviewIntent,
  EvidenceSelection,
} from '@ergon/evidence-model';
export const tenantId = '11111111-1111-4111-8111-111111111111';
export const actorId = '22222222-2222-4222-8222-222222222222';
export const proposal = {
  kind: 'CLAIM' as const,
  id: '33333333-3333-4333-8333-333333333333',
  status: 'PROPOSED' as const,
  version: 0 as const,
  sourceId: '44444444-4444-4444-8444-444444444444',
  digest: 'a'.repeat(64),
  extractionId: '55555555-5555-4555-8555-555555555555',
  compilerRevision: 'commonmark-0.24.0-v1',
  proposedBy: actorId,
  recordedAt: '2026-10-29T12:00:00Z',
  label: 'Restore access',
};
export const query: EvidenceSelection = { tenantId, actorId, proposal };
export const page: EvidencePage = { entries: [proposal], next: null };
export const inspection: EvidenceInspection = {
  target: { kind: 'CLAIM', id: proposal.id },
  status: 'PROPOSED',
  version: 0,
  procedure: null,
  review: null,
  claim: {
    id: proposal.id,
    compilerRevision: proposal.compilerRevision,
    proposedBy: actorId,
    recordedAt: proposal.recordedAt,
    status: 'PROPOSED',
    bindingRule: 'manual-claim-v1',
    start: 0,
    endExclusive: 1,
    quote: '😀',
    input: {
      extractionId: proposal.extractionId,
      observationIndex: 0,
      property: 'documentation.access.restoration.supported',
      subject: 'recovery',
      scope: 'staff',
      booleanValue: false,
      textValue: null,
      validFrom: '2026-10-29T12:00:00.000001Z',
      validUntil: '2026-10-29T12:00:00.000002Z',
    },
  },
};
export const intent: EvidenceReviewIntent = {
  ...query,
  commandId: '66666666-6666-4666-8666-666666666666',
  extractionId: proposal.extractionId,
  expectedVersion: 0,
  decision: 'ACCEPTED',
  rationale: 'Verified original source',
};
export const receipt = {
  target: inspection.target,
  commandId: intent.commandId,
  extractionId: intent.extractionId,
  version: 1 as const,
  decision: intent.decision,
  rationale: intent.rationale,
  reviewerId: actorId,
  reviewedAt: proposal.recordedAt,
};
