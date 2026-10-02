import type { HumanFollowUpClaim } from '@ergon/follow-up-model';

import type { HumanFollowUpClaimFailure } from './human-follow-up-failures';

/**
 * Revision-checked ownership intent for one tenant-scoped follow-up item.
 *
 * `tenantId` selects request context but does not confer authority; the server
 * binds ownership to the authenticated resolver.
 * `commandId` must remain stable across explicit retries of this intent;
 * `expectedOwnershipRevision` comes from the authorized inbox row.
 */
export interface HumanFollowUpClaimCommand {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly commandId: string;
  readonly expectedOwnershipRevision: number;
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
 * because its server operation has a durable exact-replay receipt: the UI owns
 * explicit retry with the same command ID after an ambiguous result.
 */
export interface ClaimHumanFollowUp {
  claim(
    command: HumanFollowUpClaimCommand,
    signal: AbortSignal,
  ): Promise<HumanFollowUpClaimResult>;
}
