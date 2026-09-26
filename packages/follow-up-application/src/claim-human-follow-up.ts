import type { HumanFollowUpClaim } from '@ergon/follow-up-domain';

import type { HumanFollowUpClaimFailure } from './human-follow-up-failures';

/** Idempotent ownership request for one tenant-scoped follow-up item. */
export interface HumanFollowUpClaimCommand {
  readonly tenantId: string;
  readonly workItemId: string;
}

export type HumanFollowUpClaimResult =
  | { readonly ok: true; readonly claim: HumanFollowUpClaim }
  | { readonly ok: false; readonly error: HumanFollowUpClaimFailure };

/** Claims one visible follow-up without automatically replaying ambiguous failures. */
export interface ClaimHumanFollowUp {
  claim(
    command: HumanFollowUpClaimCommand,
    signal: AbortSignal,
  ): Promise<HumanFollowUpClaimResult>;
}
