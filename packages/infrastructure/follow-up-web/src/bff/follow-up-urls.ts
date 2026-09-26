import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpQuery,
  ResolverFollowUpCaseSummaryQuery,
  ResolverOwnedHumanFollowUpQuery,
} from '@ergon/application-follow-up';

export const CSRF_TOKEN_PATH = '/bff/v1/csrf' as const;

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

export function ownedWorkUrl(query: ResolverOwnedHumanFollowUpQuery): string {
  const parameters = new URLSearchParams({ limit: String(query.limit) });
  if (query.cursor !== undefined) {
    parameters.set('afterClaimedAt', query.cursor.afterClaimedAt);
    parameters.set('afterClaimId', query.cursor.afterClaimId);
  }
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/owned?${parameters.toString()}`;
}

export function caseSummaryUrl(
  query: ResolverFollowUpCaseSummaryQuery,
): string {
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/case-summary`;
}

export function claimUrl(command: HumanFollowUpClaimCommand): string {
  return `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/claims`;
}
