import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-domain';

import type { HumanFollowUpFailure } from './human-follow-up-failures';

/** Exact oldest-claim-first position; both values must travel together. */
export interface ResolverOwnedHumanFollowUpCursor {
  readonly afterClaimedAt: string;
  readonly afterClaimId: string;
}

export interface ResolverOwnedHumanFollowUpPage {
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  readonly nextCursor: ResolverOwnedHumanFollowUpCursor | null;
}

/** Bounded active-work request scoped to the current tenant actor. */
export interface ResolverOwnedHumanFollowUpQuery {
  readonly tenantId: string;
  readonly limit: number;
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
}

export type ResolverOwnedHumanFollowUpResult =
  | { readonly ok: true; readonly page: ResolverOwnedHumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

/** Lists decoded follow-up work owned by the current tenant actor. */
export interface ListOwnedHumanFollowUps {
  listOwned(
    query: ResolverOwnedHumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<ResolverOwnedHumanFollowUpResult>;
}
