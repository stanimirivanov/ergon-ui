import type { RunSupervisionFailure } from './contracts';

/** Narrow current planning coordinates; no evidence content or execution authority. Every field is an exact confirmation fence. */
export interface RunRetryPlan {
  readonly caseStreamVersion: number;
  readonly contractKey: string;
  readonly contractRevision: number;
  readonly policyRevision: string;
  readonly stepId: string;
  readonly capability: string;
  readonly effectiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly requiredApproval: 'NONE' | 'REQUESTER' | 'RESOLVER';
}

/** Private cache identity for one failed-run review; expected versions bind the observation, not HTTP authority. */
export interface RunRetryReviewQuery {
  readonly tenantId: string;
  readonly runId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: 1;
}

export type RunRetryReviewReason =
  | 'DISABLED'
  | 'RUN_NOT_FAILED'
  | 'ATTEMPT_LIMIT_REACHED'
  | 'PLAN_NOT_READY'
  | 'PLAN_DENIED'
  | 'OPERATION_CHANGED';

interface RetryReviewCoordinates {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly runVersion: number;
  readonly attemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
}

/** Advisory observation, never permission. The ceiling includes the initial attempt. Disabled review may retain a plan, but only the eligible branch can confirm it. */
export type RunRetryReview = RetryReviewCoordinates &
  (
    | {
        readonly supported: true;
        readonly canRetry: true;
        readonly reason: null;
        readonly plan: RunRetryPlan;
      }
    | {
        readonly supported: false;
        readonly canRetry: false;
        readonly reason: 'DISABLED';
        readonly plan: RunRetryPlan | null;
      }
    | {
        readonly supported: true;
        readonly canRetry: false;
        readonly reason: Exclude<RunRetryReviewReason, 'DISABLED'>;
        readonly plan: null;
      }
  );

/**
 * Immutable confirmed fresh-run intent, not invocation recovery. Explicit replay
 * keeps this entire tuple: it may first commit the original intent if absent.
 * expectedAttemptNumber is local receipt attribution; the server derives it from
 * the immutable predecessor and does not accept it in the POST body.
 */
export interface RunRetryCommand extends RunRetryReviewQuery {
  readonly commandId: string;
  readonly expectedAttemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly plan: RunRetryPlan;
}

/** Historical atomic acknowledgement, not current successor access. It authorizes no execution, proof acceptance or case closure. */
export interface RunRetryReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly successorRunId: string;
  readonly supervisionRevision: number;
  readonly expectedRunVersion: 1;
  readonly caseStreamVersion: number;
  readonly retryPolicyRevision: string;
  readonly sourceAttemptNumber: number;
  readonly maximumAttempts: number;
  readonly startedAt: string;
  readonly recordedAt: string;
}

export type RunRetryFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'retry-disabled'
        | 'retry-conflict'
        | 'invalid-retry'
        | 'retry-unavailable'
        | 'retry-unsupported'
        | 'csrf-rejected';
    };
export type RunRetryReviewResult =
  | { readonly ok: true; readonly review: RunRetryReview }
  | { readonly ok: false; readonly error: RunRetryFailure };
export type RunRetryCommandResult =
  | { readonly ok: true; readonly receipt: RunRetryReceipt }
  | { readonly ok: false; readonly error: RunRetryFailure };

/**
 * Same-origin boundary: bounded reads may retry once; commands never retry
 * automatically. Each command acquires invocation-local CSRF under one deadline
 * including decoding. Cancellation does not undo a commit. Expected failures are
 * cause-free outcomes; unexpected defects reject for containment by the RTK API.
 */
export interface RunRetryClient {
  getRetryReview(
    query: RunRetryReviewQuery,
    signal: AbortSignal,
  ): Promise<RunRetryReviewResult>;
  retryRun(
    command: RunRetryCommand,
    signal: AbortSignal,
  ): Promise<RunRetryCommandResult>;
}
