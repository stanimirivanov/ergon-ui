/** Historical simulation evidence, never current authority or a promotion decision. */
export interface EvaluationArtifact {
  readonly key: string;
  readonly revision: string;
  readonly sha256: string;
}
export interface EvaluationSummary {
  readonly reportId: string;
  readonly fixture: EvaluationArtifact;
  readonly reportDigest: string;
  readonly passed: boolean;
  readonly recordedAt: string;
}
export interface EvaluationPage {
  readonly items: readonly EvaluationSummary[];
  readonly nextAfter: string | null;
}
export interface EvaluationCheck {
  readonly id: string;
  readonly required: boolean;
  readonly status: 'PASS' | 'FAIL' | 'ERROR' | 'UNSUPPORTED';
  readonly explanation:
    | 'MATCH'
    | 'MISMATCH'
    | 'MISSING_OBSERVATION'
    | 'OBSERVATION_ERROR'
    | 'UNSUPPORTED_OBSERVATION'
    | 'UNSUPPORTED_ASSERTION'
    | 'PROOF_NOT_ACCEPTED'
    | 'INVALID_PROOF_PROVENANCE';
}
/** Exact safe integers; null means unknown/unspecified, never zero. */
export interface EvaluationBudgetDimension {
  readonly limit: number | null;
  readonly measured: number | null;
  readonly status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'ERROR' | 'NOT_CONFIGURED';
  readonly reason:
    | 'MISSING_USAGE'
    | 'MISSING_PRICING'
    | 'MISSING_DURATION'
    | 'CURRENCY_MISMATCH'
    | 'OVERFLOW'
    | null;
}
export interface EvaluationReport {
  readonly summary: EvaluationSummary;
  readonly evaluator: EvaluationArtifact;
  readonly assertions: EvaluationArtifact;
  readonly checks: readonly EvaluationCheck[];
  readonly budgets: {
    readonly currency: string;
    readonly cost: EvaluationBudgetDimension;
    readonly simulatedLatency: EvaluationBudgetDimension;
  } | null;
}
/** Actor keys the ephemeral cache; the session supplies authority on the wire. */
export interface EvaluationQuery {
  readonly tenantId: string;
  readonly actorId: string;
}
export type EvaluationHistoryQuery = EvaluationQuery & {
  readonly after: string | null;
};
export type EvaluationReportQuery = EvaluationQuery & {
  readonly reportId: string;
};
/** Refuse contradictory budget state rather than presenting unknown measurements as successful. */
export function coherentBudget(value: EvaluationBudgetDimension): boolean {
  if ((value.measured === null) !== (value.reason !== null)) return false;
  if (value.limit === null) return value.status === 'NOT_CONFIGURED';
  if (value.measured !== null)
    return value.status === (value.measured <= value.limit ? 'PASS' : 'FAIL');
  return (
    value.status ===
    (value.reason === 'OVERFLOW' || value.reason === 'CURRENCY_MISMATCH'
      ? 'ERROR'
      : 'UNKNOWN')
  );
}
