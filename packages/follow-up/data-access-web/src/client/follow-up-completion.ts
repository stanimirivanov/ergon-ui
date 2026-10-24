import type { FollowUpCompletion } from '@ergon/follow-up-model';
import type { HumanFollowUpCommandFailure } from './human-follow-up-failures';

/**
 * Ephemeral original completion intent. IDs are canonical UUIDs and the current
 * claimed revision is a positive safe odd integer. Retain the entire tuple
 * after uncertainty; the verified session alone supplies actor and authority.
 */
export interface FollowUpCompletionCommand {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly commandId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
}

export type FollowUpCompletionFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'not-found' }
  | { readonly kind: 'completion-conflict' }
  | { readonly kind: 'invalid-completion' }
  | { readonly kind: 'completion-unavailable' };

/** Session-CSRF operation; shares the adapter's token lifetime, never another cache. */
export interface FollowUpCompletionClient {
  /**
   * Sends one bounded POST, with no automatic replay or persistent intent.
   * Exact recovery requires the original actor's current resolver authority,
   * even after terminal retirement. Acknowledgement grants no private access.
   * Cancellation/timeout/invalid response/defect may leave a committed write;
   * RTK contains unexpected rejections without serializing their causes.
   */
  complete(
    command: FollowUpCompletionCommand,
    signal: AbortSignal,
  ): Promise<
    | { readonly ok: true; readonly completion: FollowUpCompletion }
    | { readonly ok: false; readonly error: FollowUpCompletionFailure }
  >;
}
