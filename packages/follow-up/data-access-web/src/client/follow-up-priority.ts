import type {
  FollowUpPriority,
  FollowUpPriorityAssignment,
} from '@ergon/follow-up-model';
import type { HumanFollowUpCommandFailure } from './human-follow-up-failures';

/**
 * Confirmed UUID coordinates with a positive safe odd ownership revision and a
 * nonnegative safe priority revision whose successor is also representable.
 * Retain the entire tuple after uncertainty, never substitute either fence.
 * Only the verified session supplies the actor and current resolver authority.
 */
export interface FollowUpPriorityCommand {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly commandId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
  readonly expectedPriorityRevision: number;
  readonly priority: FollowUpPriority;
}

export type FollowUpPriorityFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'not-found' }
  | { readonly kind: 'priority-conflict' }
  | { readonly kind: 'invalid-priority' }
  | { readonly kind: 'priority-unavailable' };

export interface FollowUpPriorityClient {
  /**
   * One bounded CSRF-protected POST, never automatically retried. Receipt is
   * historical, not current metadata. Exact recovery still requires the original
   * actor's current authority and original ACTIVE claim. Cancellation or a defect
   * does not establish that no assignment committed. Unexpected implementation
   * defects can reject a direct call; RTK contains those rejections safely.
   */
  assignPriority(
    command: FollowUpPriorityCommand,
    signal: AbortSignal,
  ): Promise<
    | { readonly ok: true; readonly assignment: FollowUpPriorityAssignment }
    | { readonly ok: false; readonly error: FollowUpPriorityFailure }
  >;
}
