import type {
  EvaluationHistoryQuery,
  EvaluationReportQuery,
  EvaluationPage,
  EvaluationReport,
} from '@ergon/evaluation-model';
export type EvaluationFailure = {
  readonly kind:
    | 'authentication-required'
    | 'denied'
    | 'unavailable'
    | 'transport'
    | 'timeout'
    | 'request-cancelled'
    | 'invalid-response'
    | 'unexpected-defect';
};
export type EvaluationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: EvaluationFailure };
/** Read only; caller owns cancellation. One five-second budget includes decoding. No retries or persistence. */
export interface EvaluationClient {
  read(
    query: EvaluationHistoryQuery | EvaluationReportQuery,
    signal: AbortSignal,
  ): Promise<EvaluationResult<EvaluationPage | EvaluationReport>>;
}
