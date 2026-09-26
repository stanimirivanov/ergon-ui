import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-domain';

import type { ResolverFollowUpCaseSummaryFailure } from './human-follow-up-failures';

/** Identifies one owned follow-up whose server-authorized context is requested. */
export interface ResolverFollowUpCaseSummaryQuery {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
}

export type ResolverFollowUpCaseSummaryResult =
  | { readonly ok: true; readonly summary: ResolverFollowUpCaseSummary }
  | { readonly ok: false; readonly error: ResolverFollowUpCaseSummaryFailure };

/** Loads decoded case context after the server rechecks ownership and authority. */
export interface GetOwnedFollowUpCaseSummary {
  getOwnedCaseSummary(
    query: ResolverFollowUpCaseSummaryQuery,
    signal: AbortSignal,
  ): Promise<ResolverFollowUpCaseSummaryResult>;
}
