import type { FencedRunCommand } from './control-contracts';
import type { RunSupervisionFailure } from './contracts';

/** Private review identity; expected versions bind the observation, never supply authority. */
export interface RunEscalationReviewQuery {
  readonly tenantId: string;
  readonly runId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: 1;
}

export type RunEscalationReviewReason =
  | 'DISABLED'
  | 'RUN_NOT_FAILED'
  | 'RETRY_BUDGET_AVAILABLE'
  | 'RETRY_ATTEMPT_LIMIT_REACHED';

interface EscalationReviewCoordinates {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly runVersion: number;
  readonly attemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly followUpQueueKey: 'access-restoration';
}

/** Advisory runtime exhaustion, not permission. The total ceiling includes the initial attempt; only the exhausted branch permits confirmation and the queue is server-selected. */
export type RunEscalationReview = EscalationReviewCoordinates &
  (
    | {
        readonly supported: false;
        readonly canEscalate: false;
        readonly reason: 'DISABLED';
      }
    | {
        readonly supported: true;
        readonly canEscalate: false;
        readonly reason: 'RUN_NOT_FAILED' | 'RETRY_BUDGET_AVAILABLE';
      }
    | {
        readonly supported: true;
        readonly canEscalate: true;
        readonly reason: 'RETRY_ATTEMPT_LIMIT_REACHED';
      }
  );

/** Immutable confirmed exhaustion. Uncertain replay preserves every field and may first commit this original intent if it is absent. */
export interface RunEscalationCommand
  extends RunEscalationReviewQuery, FencedRunCommand {
  readonly commandId: string;
  readonly sourceAttemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly reason: 'RETRY_ATTEMPT_LIMIT_REACHED';
}

/** Historical creation facts, not present run/work access. OPEN is the original creation status, never current ownership or lifecycle. */
export interface RunEscalationReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly supervisionRevision: number;
  readonly expectedRunVersion: 1;
  readonly sourceAttemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly reason: 'RETRY_ATTEMPT_LIMIT_REACHED';
  readonly escalationEventId: string;
  readonly followUpWorkItemId: string;
  readonly followUpQueueKey: 'access-restoration';
  readonly creationStatus: 'OPEN';
  readonly requestedAt: string;
  readonly recordedAt: string;
}

export type RunEscalationFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'escalation-disabled'
        | 'escalation-conflict'
        | 'invalid-escalation'
        | 'escalation-unavailable'
        | 'escalation-unsupported'
        | 'csrf-rejected';
    };
export type RunEscalationReviewResult =
  | { readonly ok: true; readonly review: RunEscalationReview }
  | { readonly ok: false; readonly error: RunEscalationFailure };
export type RunEscalationCommandResult =
  | { readonly ok: true; readonly receipt: RunEscalationReceipt }
  | { readonly ok: false; readonly error: RunEscalationFailure };

/** Same-origin boundary. Reads may retry once; commands never retry automatically. One deadline covers invocation-local CSRF, POST and decoding. Cancellation cannot undo a commit; defects reject for RTK containment. */
export interface RunEscalationClient {
  getEscalationReview(
    query: RunEscalationReviewQuery,
    signal: AbortSignal,
  ): Promise<RunEscalationReviewResult>;
  escalateRun(
    command: RunEscalationCommand,
    signal: AbortSignal,
  ): Promise<RunEscalationCommandResult>;
}
