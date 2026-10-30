/** Documentary labels never assert operational truth or confer execution authority. */
export type ProposalKind = 'CLAIM' | 'PROCEDURE';
export type ReviewDecision = 'ACCEPTED' | 'REJECTED';
export type ReviewStatus = 'PROPOSED' | ReviewDecision;
export interface EvidenceTarget {
  readonly kind: ProposalKind;
  readonly id: string;
}
export interface EvidenceCursor {
  readonly beforeRecordedAt: string;
  readonly beforeKind: ProposalKind;
  readonly beforeId: string;
}
export interface PendingEvidence extends EvidenceTarget {
  readonly status: 'PROPOSED';
  readonly version: 0;
  readonly sourceId: string;
  readonly digest: string;
  readonly extractionId: string;
  readonly compilerRevision: string;
  readonly proposedBy: string;
  readonly recordedAt: string;
  readonly label: string;
}
export interface EvidencePage {
  readonly entries: readonly PendingEvidence[];
  readonly next: EvidenceCursor | null;
}
export interface EvidenceQuery {
  readonly tenantId: string;
  readonly actorId: string;
}
export interface EvidenceSelection extends EvidenceQuery {
  readonly proposal: PendingEvidence;
}
export interface Citation {
  readonly sourceId: string;
  readonly digest: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly quote: string;
}
export interface DocumentaryClaim {
  readonly bindingRule: 'manual-claim-v1';
  readonly id: string;
  readonly input: {
    readonly extractionId: string;
    readonly observationIndex: number;
    readonly property: string;
    readonly subject: string;
    readonly scope: string;
    readonly booleanValue: boolean | null;
    readonly textValue: string | null;
    readonly validFrom: string | null;
    readonly validUntil: string | null;
  };
  readonly start: number;
  readonly endExclusive: number;
  readonly quote: string;
  readonly compilerRevision: string;
  readonly proposedBy: string;
  readonly recordedAt: string;
  readonly status: ReviewStatus;
}
export interface DocumentaryProcedure {
  readonly bindingRule: 'ordered-list-procedure-v1';
  readonly id: string;
  readonly title: string;
  readonly extractionId: string;
  readonly compilerRevision: string;
  readonly observationIndex: number;
  readonly citation: Citation;
  readonly steps: readonly {
    readonly position: number;
    readonly citation: Citation;
    readonly operation: {
      readonly extractionId: string;
      readonly compilerRevision: string;
      readonly observationIndex: number;
      readonly jsonPointer: string;
      readonly citation: Citation;
    } | null;
  }[];
  readonly proposedBy: string;
  readonly recordedAt: string;
  readonly status: ReviewStatus;
}
export interface EvidenceReceipt {
  readonly target: EvidenceTarget;
  readonly commandId: string;
  readonly extractionId: string;
  readonly version: 1;
  readonly decision: ReviewDecision;
  readonly rationale: string;
  readonly reviewerId: string;
  readonly reviewedAt: string;
}
export interface EvidenceInspection {
  readonly target: EvidenceTarget;
  readonly status: ReviewStatus;
  readonly version: 0 | 1;
  readonly claim: DocumentaryClaim | null;
  readonly procedure: DocumentaryProcedure | null;
  readonly review: EvidenceReceipt | null;
}
/** Capture once in mounted local state. Exact uncertain replay must not change any field. No actor/proof is sent. */
export interface EvidenceReviewIntent extends EvidenceSelection {
  readonly commandId: string;
  readonly extractionId: string;
  readonly expectedVersion: 0;
  readonly decision: ReviewDecision;
  readonly rationale: string;
}
/** Matches the backend's UTF-16 budget; reject malformed Unicode and controls except tab/line breaks. */
export function validReviewRationale(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 2000 &&
    value.trim() === value &&
    value.trim().length > 0 &&
    Array.from(value).every((ch) => {
      const code = ch.charCodeAt(0);
      return (
        (code >= 32 || ch === '\r' || ch === '\n' || ch === '\t') &&
        (code < 127 || code > 159)
      );
    }) &&
    !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
      value,
    )
  );
}
export { validEvidenceId, canonicalEvidenceIds } from './knowledge';
export type {
  ClaimComparison,
  ContradictionAssessment,
  KnowledgeTarget,
  KnowledgeQuery,
  AdjudicationIntent,
  DocumentaryAdjudication,
  BundleIntent,
  DocumentaryBundle,
} from './knowledge';
