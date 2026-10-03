import type { HumanFollowUpRelease } from '@ergon/follow-up-model';

import type { HumanFollowUpReleaseFailure } from './human-follow-up-failures';

/**
 * Exact active-claim release intent from an authorized owned-work row.
 *
 * The BFF resolves the actor from the browser session. Retrying an uncertain
 * result must preserve the claim ID and expected ownership revision; neither
 * tenant selection nor these IDs confer authority.
 */
export interface HumanFollowUpReleaseCommand {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
}

/** Recorded release or presentation-safe failure. */
export type HumanFollowUpReleaseResult =
  | { readonly ok: true; readonly release: HumanFollowUpRelease }
  | { readonly ok: false; readonly error: HumanFollowUpReleaseFailure };

/**
 * Releases only the named current claim without automatic mutation replay.
 *
 * Implementations honor cancellation as `request-cancelled`. An ambiguous
 * result is retried only through an explicit caller action with the same
 * command tuple.
 */
export interface ReleaseHumanFollowUp {
  release(
    command: HumanFollowUpReleaseCommand,
    signal: AbortSignal,
  ): Promise<HumanFollowUpReleaseResult>;
}
