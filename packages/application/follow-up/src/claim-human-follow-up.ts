import type { HumanFollowUpClaim } from '@ergon/domain-follow-up';

import type { HumanFollowUpClaimFailure } from './human-follow-up-failures';

/**
 * Idempotent ownership request for one tenant-scoped follow-up item.
 *
 * `tenantId` selects request context but does not confer authority; the server
 * binds ownership to the authenticated resolver.
 */
export interface HumanFollowUpClaimCommand {
  readonly tenantId: string;
  readonly workItemId: string;
}

/** Recorded ownership or an explicit claim failure. */
export type HumanFollowUpClaimResult =
  | { readonly ok: true; readonly claim: HumanFollowUpClaim }
  | { readonly ok: false; readonly error: HumanFollowUpClaimFailure };

/**
 * Claims one visible follow-up without replaying ambiguous failures.
 *
 * Implementations must honor `signal` and resolve cancellation as
 * `request-cancelled`. They must not automatically retry the mutation merely
 * because its server operation is idempotent: the UI owns explicit retry after
 * an ambiguous transport result.
 */
export interface ClaimHumanFollowUp {
  claim(
    command: HumanFollowUpClaimCommand,
    signal: AbortSignal,
  ): Promise<HumanFollowUpClaimResult>;
}
