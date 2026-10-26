import type { RequesterQuestions } from './question-history';

/** Public lifecycle observation only: OPEN is not a run state; resolution requires server-accepted proof. */
export interface RequesterProgress {
  readonly caseId: string;
  readonly goal: string;
  readonly status: 'OPEN' | 'VERIFIED_RESOLVED';
  /** UTC instants describe case projection changes, not proof or ownership recording. */
  readonly openedAt: string;
  readonly updatedAt: string;
}
/** Validated supplied-link coordinates, never evidence of ownership. */
export interface ProgressQuery {
  readonly tenantId: string;
  readonly caseId: string;
}
/** Closed, diagnostic-free outcomes safe for Redux and presentation; no raw server/browser causes. */
export type ProgressFailure = {
  readonly kind:
    | 'authentication-required'
    | 'forbidden'
    | 'not-found'
    | 'unavailable'
    | 'timeout'
    | 'transport'
    | 'invalid-response'
    | 'unexpected-response'
    | 'unexpected-defect'
    | 'request-cancelled';
};
export type ProgressResult =
  | { readonly ok: true; readonly progress: RequesterProgress }
  | { readonly ok: false; readonly error: ProgressFailure };
export type RequesterQuestionsResult =
  | { readonly ok: true; readonly questions: RequesterQuestions }
  | { readonly ok: false; readonly error: ProgressFailure };
/**
 * Reads one explicitly owned case. Identity is supplied by the server session,
 * not these coordinates. Expected failures and cancellation resolve as outcomes;
 * unexpected implementation defects may reject and are contained by the cache.
 */
export interface ProgressClient {
  read(query: ProgressQuery, signal: AbortSignal): Promise<ProgressResult>;
  /** Separately authorized history, including closed owned cases; no delivery acknowledgement or mutation. */
  readQuestions(
    query: ProgressQuery,
    signal: AbortSignal,
  ): Promise<RequesterQuestionsResult>;
}
