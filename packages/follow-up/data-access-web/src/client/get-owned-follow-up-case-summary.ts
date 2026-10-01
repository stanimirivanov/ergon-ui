import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';

import type { ResolverFollowUpCaseSummaryFailure } from './human-follow-up-failures';

/**
 * Identifies one owned follow-up whose server-authorized context is requested.
 *
 * All identifiers must describe the same work item and escalated run.
 * `tenantId` selects request context but does not confer authority.
 */
export interface ResolverFollowUpCaseSummaryQuery {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
}

/** Authorized evidence snapshot or a non-disclosing typed failure. */
export type ResolverFollowUpCaseSummaryResult =
  | { readonly ok: true; readonly summary: ResolverFollowUpCaseSummary }
  | { readonly ok: false; readonly error: ResolverFollowUpCaseSummaryFailure };

/**
 * Loads decoded case context after the server rechecks ownership and authority.
 *
 * Implementations must reject mismatched work-item, case, and run identities,
 * honor `signal`, and resolve cancellation as `request-cancelled`. A
 * `not-found` outcome deliberately does not reveal which ownership or resource
 * condition failed.
 */
export interface GetOwnedFollowUpCaseSummary {
  getOwnedCaseSummary(
    query: ResolverFollowUpCaseSummaryQuery,
    signal: AbortSignal,
  ): Promise<ResolverFollowUpCaseSummaryResult>;
}
