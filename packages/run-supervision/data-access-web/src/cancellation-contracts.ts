import type { RunSupervisionFailure } from './contracts';

/** Expected coordinates bind a fresh observation; they never confer authority. */
export interface RunCancellationReviewQuery {
  readonly tenantId: string;
  readonly runId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: 0;
}

export type RunCancellationReviewReason =
  | 'DISABLED'
  | 'RUN_NOT_UNTOUCHED'
  | 'AUTHORIZATION_OR_EXECUTION_RECORDED'
  | 'ELIGIBLE';

/** Advisory eligibility. Only the supported ELIGIBLE branch permits confirmation. */
export type RunCancellationReview = {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly runVersion: number;
} & (
  | {
      readonly supported: false;
      readonly canCancel: false;
      readonly reason: 'DISABLED';
    }
  | {
      readonly supported: true;
      readonly canCancel: false;
      readonly reason:
        'RUN_NOT_UNTOUCHED' | 'AUTHORIZATION_OR_EXECUTION_RECORDED';
    }
  | {
      readonly supported: true;
      readonly canCancel: true;
      readonly reason: 'ELIGIBLE';
    }
);

/** Immutable intent retained only for explicit unchanged replay, which may first apply an absent command. */
export interface RunCancellationCommand extends RunCancellationReviewQuery {
  readonly commandId: string;
}

/** Historical cancellation acknowledgement, not present access, provider termination or case closure. */
export interface RunCancellationReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly supervisionRevision: number;
  readonly expectedRunVersion: 0;
  readonly reason: 'OPERATOR_REQUESTED';
  readonly cancelledAt: string;
  readonly recordedAt: string;
}

export type RunCancellationFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'cancellation-disabled'
        | 'cancellation-conflict'
        | 'invalid-cancellation'
        | 'cancellation-unavailable'
        | 'cancellation-unsupported'
        | 'csrf-rejected';
    };
export type RunCancellationReviewResult =
  | { readonly ok: true; readonly review: RunCancellationReview }
  | { readonly ok: false; readonly error: RunCancellationFailure };
export type RunCancellationCommandResult =
  | { readonly ok: true; readonly receipt: RunCancellationReceipt }
  | { readonly ok: false; readonly error: RunCancellationFailure };

/** Same-origin reads may retry once; commands share one CSRF/POST deadline and never retry automatically. Abort cannot undo a commit. */
export interface RunCancellationClient {
  getCancellationReview(
    query: RunCancellationReviewQuery,
    signal: AbortSignal,
  ): Promise<RunCancellationReviewResult>;
  cancelRun(
    command: RunCancellationCommand,
    signal: AbortSignal,
  ): Promise<RunCancellationCommandResult>;
}
