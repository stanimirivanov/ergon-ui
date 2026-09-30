import type { ResolverOwnedHumanFollowUpWork } from '@ergon/domain-follow-up';

import type { HumanFollowUpFailure } from './human-follow-up-failures';

/**
 * Exclusive oldest-claim-first keyset position returned by the server.
 *
 * The validated UTC instant and claim UUID form one cursor and must travel
 * together.
 */
export interface ResolverOwnedHumanFollowUpCursor {
  readonly afterClaimedAt: string;
  readonly afterClaimId: string;
}

/** Oldest-claim-first page of open work owned by the current resolver. */
export interface ResolverOwnedHumanFollowUpPage {
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  /** Exact continuation position, or `null` when no later page exists. */
  readonly nextCursor: ResolverOwnedHumanFollowUpCursor | null;
}

/**
 * Bounded active-work request scoped to the current tenant actor.
 *
 * `tenantId` selects request context but does not confer authority. `limit`
 * must be a positive, server-supported page size.
 */
export interface ResolverOwnedHumanFollowUpQuery {
  readonly tenantId: string;
  readonly limit: number;
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
}

/** Decoded owned-work page or a failure safe for presentation and Redux state. */
export type ResolverOwnedHumanFollowUpResult =
  | { readonly ok: true; readonly page: ResolverOwnedHumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

/**
 * Lists decoded follow-up work owned by the current tenant actor.
 *
 * The server rechecks current ownership and authority. Implementations must
 * honor `signal` and resolve cancellation as `request-cancelled`.
 */
export interface ListOwnedHumanFollowUps {
  listOwned(
    query: ResolverOwnedHumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<ResolverOwnedHumanFollowUpResult>;
}
