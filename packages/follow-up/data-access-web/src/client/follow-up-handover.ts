import type { FollowUpHandover } from '@ergon/follow-up-model';
import type { HumanFollowUpCommandFailure } from './human-follow-up-failures';

/**
 * Exact ephemeral transfer intent. IDs are canonical UUIDs; the positive odd
 * revision must allow a safe +2. Retain every coordinate after uncertainty.
 * Sender identity and authority are supplied only by the verified BFF session.
 */
export interface FollowUpHandoverCommand {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly commandId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
  readonly recipientActorId: string;
}

export type FollowUpHandoverFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'not-found' }
  | { readonly kind: 'handover-conflict' }
  | { readonly kind: 'recipient-unavailable' }
  | { readonly kind: 'invalid-handover' }
  | { readonly kind: 'handover-unavailable' };

/** One bounded CSRF-protected POST, never automatically replayed or persisted. */
export interface FollowUpHandoverClient {
  /**
   * Acknowledges first application or exact historical replay. Current sender
   * resolver authority is required even after ownership changes. Typed failures
   * expose no raw causes; timeout/cancellation/invalid response/defect may leave
   * the write uncertain. Direct unexpected rejection is contained at RTK.
   */
  handOver(
    command: FollowUpHandoverCommand,
    signal: AbortSignal,
  ): Promise<
    | { readonly ok: true; readonly handover: FollowUpHandover }
    | { readonly ok: false; readonly error: FollowUpHandoverFailure }
  >;
}
