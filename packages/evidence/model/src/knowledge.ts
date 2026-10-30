import type { DocumentaryClaim, EvidenceQuery, ProposalKind } from './index';

export type ClaimComparison =
  'DISJOINT_VALIDITY' | 'COMPATIBLE' | 'CONFLICT' | 'UNDETERMINED';
/** Complete canonical candidates and pair findings for one exact registered key, never a page. */
export interface ContradictionAssessment {
  readonly algorithm: 'documentary-contradictions-v1';
  readonly property: string;
  readonly subject: string;
  readonly scope: string;
  readonly revision: number;
  readonly state:
    | 'CONFLICT'
    | 'UNDETERMINED'
    | 'INSUFFICIENT_CANDIDATES'
    | 'NO_DETECTED_CONFLICT';
  readonly hasUndetermined: boolean;
  readonly candidates: readonly {
    readonly id: string;
    readonly reviewCommandId: string;
    readonly sourceId: string;
    readonly digest: string;
    readonly claim: DocumentaryClaim;
  }[];
  readonly findings: readonly {
    readonly left: string;
    readonly right: string;
    readonly comparison: ClaimComparison;
  }[];
}
export type KnowledgeTarget = {
  readonly kind: 'assessment' | 'adjudication' | 'bundle';
  readonly id: string;
};
export interface KnowledgeQuery extends EvidenceQuery {
  readonly id: string;
}
/** Capture once; retries preserve all coordinates and rationale. No proof or resource snapshot. */
export interface AdjudicationIntent extends EvidenceQuery {
  readonly id: string;
  readonly anchorId: string;
  readonly expectedRevision: number;
  readonly candidateIds: readonly string[];
  readonly choice: 'PREFER_CLAIM' | 'DEFER';
  readonly selectedClaimId: string | null;
  readonly rationale: string;
}
export interface DocumentaryAdjudication {
  readonly id: string;
  readonly anchorId: string;
  readonly choice: 'PREFER_CLAIM' | 'DEFER';
  readonly selectedClaimId: string | null;
  readonly rationale: string;
  readonly reviewerId: string;
  readonly adjudicatedAt: string;
  readonly current: boolean;
  readonly assessment: ContradictionAssessment;
}
/** Canonical sorted exact selection; backend rechecks qualification atomically on first publication. */
export interface BundleIntent extends EvidenceQuery {
  readonly id: string;
  readonly claims: readonly string[];
  readonly procedures: readonly string[];
  readonly claimSets: readonly {
    readonly anchorId: string;
    readonly revision: number;
    readonly candidateIds: readonly string[];
    readonly adjudicationId: string | null;
  }[];
}
export interface DocumentaryBundle {
  readonly id: string;
  readonly sha256: string;
  readonly publishedBy: string;
  readonly recordedAt: string;
  readonly manifest: {
    readonly schema: 'ergon.dev/evidence-bundle/v1';
    readonly tenantId: string;
    readonly assessedAt: string;
    readonly proposals: readonly {
      readonly kind: ProposalKind;
      readonly id: string;
      readonly sourceId: string;
      readonly digest: string;
      readonly extractionId: string;
      readonly compilerRevision: string;
      readonly reviewCommandId: string;
      readonly selected: boolean;
    }[];
    readonly sources: readonly {
      readonly sourceId: string;
      readonly digest: string;
    }[];
    readonly claimSets: readonly {
      readonly property: 'SUPPORT' | 'REQUIREMENT';
      readonly subject: string;
      readonly scope: string;
      readonly revision: number;
      readonly candidateIds: readonly string[];
      readonly reviewCommandIds: readonly string[];
      readonly findingCodes: readonly Exclude<
        ClaimComparison,
        'UNDETERMINED'
      >[];
      readonly adjudicationId: string | null;
    }[];
  };
}
/** UI identity refinement only; a valid identifier confers no access. */
export function validEvidenceId(value: string): boolean {
  return /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value);
}
/** Matches canonical UUID string ordering used by the backend. Empty lists are permitted here. */
export function canonicalEvidenceIds(values: readonly string[]): boolean {
  return values.every(
    (id, i) => validEvidenceId(id) && (i === 0 || (values[i - 1] ?? '') < id),
  );
}
