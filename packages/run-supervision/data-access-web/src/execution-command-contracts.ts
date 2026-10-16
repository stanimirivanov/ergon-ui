import type { RunSupervisionFailure } from './contracts';

/** Private initial-step review identity (run version zero). Expected revisions bind the observation to the disclosed Console, not HTTP authority. */
export interface RunExecutionReviewQuery {
  readonly tenantId: string;
  readonly runId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
}

/** Server-observed eligibility only; commandId is disclosed only to its originator. Null IDs mean unavailable prerequisites/intent. */
export interface RunExecutionReview {
  readonly supported: boolean;
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly runVersion: number;
  readonly requestId: string | null;
  readonly decisionId: string | null;
  readonly commandId: string | null;
  readonly canExecute: boolean;
  readonly canResume: boolean;
}

interface ExecutionCoordinates {
  readonly tenantId: string;
  readonly runId: string;
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: 0;
}

/**
 * Immutable dispatch intent, never an arbitrary tool call. An already admitted
 * identity only acknowledges status; retrying an unadmitted identity may first
 * admit that original confirmed intent. Additional recovery requires a distinct
 * confirmed attempt. Never change IDs/revisions after an uncertain result.
 */
export type RunExecutionCommand = ExecutionCoordinates &
  (
    | {
        readonly kind: 'execute';
        readonly requestId: string;
        readonly decisionId: string;
      }
    | { readonly kind: 'resume'; readonly attemptId: string }
  );

interface ExecutionAcknowledgement {
  readonly commandId: string;
  readonly attemptId: string;
  readonly runId: string;
  /** Original command persistence time, not this recovery attempt's admission time. */
  readonly admittedRecordedAt: string;
}

/** Historical sequence-one acknowledgement. A 202 may follow an external effect; COMPLETED is neither current run state nor proof. */
export type RunExecutionReceipt = ExecutionAcknowledgement &
  (
    | {
        readonly status: 'INCOMPLETE' | 'RESULT_RECORDED';
        readonly outcome: null;
        readonly resultingState: null;
        readonly runSequence: null;
        readonly completedAt: null;
        readonly resultRecordedAt: null;
      }
    | ({
        readonly status: 'COMPLETED';
        readonly runSequence: 1;
        readonly completedAt: string;
        readonly resultRecordedAt: string;
      } & (
        | {
            readonly outcome: 'SUCCEEDED';
            readonly resultingState: 'VERIFYING';
          }
        | {
            readonly outcome: 'FAILED';
            readonly resultingState: 'ACTION_FAILED';
          }
      ))
  );

export type RunExecutionFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'execution-disabled'
        | 'execution-conflict'
        | 'invalid-execution'
        | 'execution-unavailable'
        | 'execution-unsupported'
        | 'csrf-rejected';
    };
export type RunExecutionReviewResult =
  | { readonly ok: true; readonly review: RunExecutionReview }
  | { readonly ok: false; readonly error: RunExecutionFailure };
export type RunExecutionCommandResult =
  | { readonly ok: true; readonly receipt: RunExecutionReceipt }
  | { readonly ok: false; readonly error: RunExecutionFailure };

/**
 * Same-origin execution boundary. Each invocation has one deadline including body
 * decoding; reads may retry once, commands never do. CSRF is invocation-local.
 * Cancellation cannot undo admitted effects. Expected failures are cause-free
 * outcomes; unexpected defects reject for containment at the RTK boundary.
 */
export interface RunExecutionClient {
  getExecutionReview(
    query: RunExecutionReviewQuery,
    signal: AbortSignal,
  ): Promise<RunExecutionReviewResult>;
  submitExecution(
    command: RunExecutionCommand,
    signal: AbortSignal,
  ): Promise<RunExecutionCommandResult>;
}
