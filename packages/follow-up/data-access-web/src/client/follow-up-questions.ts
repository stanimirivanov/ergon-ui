import type {
  HumanFollowUpCommandFailure,
  ResolverFollowUpCaseSummaryFailure,
} from './human-follow-up-failures';
import type {
  FollowUpQuestion,
  FollowUpQuestions,
} from '@ergon/follow-up-model';

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

/** Immutable replay tuple. Case is checked against the receipt, never caller-selected on the wire.
 * Preserve the original UUID and exact text after uncertainty; author and timestamps are server-owned.
 */
export interface RecordFollowUpQuestionCommand extends FollowUpQuestionsQuery {
  readonly requestId: string;
  readonly question: string;
}

export type FollowUpQuestionFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'not-found' }
  | { readonly kind: 'question-conflict' }
  | { readonly kind: 'invalid-question' };

/** One interruptible CSRF-protected POST; no automatic replay. A failed/rejected call can leave a durable write.
 * 200 and 201 both acknowledge historical intent, never delivery or continuing access.
 */
export type RecordFollowUpQuestion = (
  command: RecordFollowUpQuestionCommand,
  signal: AbortSignal,
) => Promise<
  | { readonly ok: true; readonly question: FollowUpQuestion }
  | { readonly ok: false; readonly error: FollowUpQuestionFailure }
>;
