import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/** Source identity and locally expected safe supervision epoch; the epoch is not sent or used as authority. */
export interface RunRetrySuccessorQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
}

/**
 * Observation-time navigation only. Null conflates absent retry, unassigned target
 * and denied target access; it never proves that no retry occurred. Target epoch
 * is independent of source epoch and grants no subsequent detail/command access.
 */
export interface RunRetrySuccessor {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly successor: {
    readonly runId: string;
    readonly supervisionRevision: number;
  } | null;
}

export type RunRetrySuccessorFailure =
  RunSupervisionFailure | { readonly kind: 'successor-unsupported' };

export type RunRetrySuccessorResult =
  | { readonly ok: true; readonly value: RunRetrySuccessor }
  | { readonly ok: false; readonly error: RunRetrySuccessorFailure };

/**
 * Current source and target authority remain server-owned. No lease, CSRF or
 * originating command is acquired. Reads have bounded timeout/transient retry
 * and caller cancellation; expected failures are values. Unexpected defects may
 * reject and must be contained at the RTK boundary. No polling or persistence.
 */
export interface RunRetrySuccessorClient {
  readonly getRetrySuccessor: (
    query: RunRetrySuccessorQuery,
    signal: AbortSignal,
  ) => Promise<RunRetrySuccessorResult>;
}
