import type { ResolverFollowUpCaseSummaryFailure } from './human-follow-up-failures';
import type { FollowUpQuestions } from '@ergon/follow-up-model';

/**
 * Exact selected case/claim partition a private lifetime; only the backend grants current access.
 * Revision is a positive safe integer from a decoded owned-work projection, never a rounded BIGINT.
 */
export interface FollowUpQuestionsQuery {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
}

/**
 * Interruptible current-owner read; one transient retry, no mutation or persistent receipt access.
 * Expected failures are safe results. Unexpected defects may reject and must be contained by the cache.
 */
export type ListFollowUpQuestions = (
  query: FollowUpQuestionsQuery,
  signal: AbortSignal,
) => Promise<
  | { readonly ok: true; readonly questions: FollowUpQuestions }
  | { readonly ok: false; readonly error: ResolverFollowUpCaseSummaryFailure }
>;
