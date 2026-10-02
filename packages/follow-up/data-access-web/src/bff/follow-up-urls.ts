import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpQuery,
  ResolverFollowUpCaseSummaryQuery,
  ResolverOwnedHumanFollowUpQuery,
} from '../client';

/** Same-origin endpoint for acquiring an ephemeral browser CSRF token. */
export const CSRF_TOKEN_PATH = '/bff/v1/csrf' as const;

/**
 * Builds the visible-work URL with an optional exact queue and paired keyset
 * cursor. All path and query values are encoded as data.
 */
export function inboxUrl(query: HumanFollowUpQuery): string {
  const parameters = new URLSearchParams({ limit: String(query.limit) });
  if (query.queueKey !== undefined) {
    parameters.set('queueKey', query.queueKey);
  }
  if (query.cursor !== undefined) {
    parameters.set('afterOpenedAt', query.cursor.afterOpenedAt);
    parameters.set('afterWorkItemId', query.cursor.afterWorkItemId);
  }
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups?${parameters.toString()}`;
}

/** Builds the owned-work URL with its paired oldest-claim-first cursor. */
export function ownedWorkUrl(query: ResolverOwnedHumanFollowUpQuery): string {
  const parameters = new URLSearchParams({ limit: String(query.limit) });
  if (query.cursor !== undefined) {
    parameters.set('afterClaimedAt', query.cursor.afterClaimedAt);
    parameters.set('afterClaimId', query.cursor.afterClaimId);
  }
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/owned?${parameters.toString()}`;
}

/** Builds the case-context URL for one resolver-owned work item. */
export function caseSummaryUrl(
  query: ResolverFollowUpCaseSummaryQuery,
): string {
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/case-summary`;
}

/** Builds the revision-checked claim-command URL for one visible work item. */
export function claimUrl(command: HumanFollowUpClaimCommand): string {
  return `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/claim-commands`;
}
