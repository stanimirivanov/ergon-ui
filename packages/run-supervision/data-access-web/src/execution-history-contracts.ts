import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/**
 * Exact tenant/run identity plus a nonnegative safe epoch below Number.MAX_SAFE_INTEGER.
 * The epoch is a local disclosure expectation, not command authority or a sent parameter.
 */
export interface RunExecutionHistoryQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
}

/**
 * A committed admission checkpoint, not proof of provider I/O, completion or
 * exactly-once execution. Times retain their original UTC precision; revisions
 * describe historical supervision, not current rights.
 */
export interface RunExecutionAdmission {
  readonly kind: 'INITIAL' | 'RECOVERY';
  readonly supervisionRevision: number;
  readonly admittedAt: string;
  readonly recordedAt: string;
}

/**
 * Sanitized current-supervisor observation, including earlier epochs and terminal runs.
 * Entries retain server recording order (private tie-breaker); neither array position
 * nor wall time establishes causal order. A truncated result is capped at 100, not
 * a total or a stable prefix. No browser command does not exclude internal execution.
 */
export interface RunExecutionHistory {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly commandRecorded: boolean;
  readonly entries: readonly RunExecutionAdmission[];
  readonly truncated: boolean;
}

export type RunExecutionHistoryResult =
  | { readonly ok: true; readonly value: RunExecutionHistory }
  | { readonly ok: false; readonly error: RunExecutionHistoryFailure };

/** Unsupported protocol is not supported empty history or a neutral authorization denial. */
export type RunExecutionHistoryFailure =
  RunSupervisionFailure | { readonly kind: 'history-unsupported' };

/**
 * Read-only access requires current supervision/resolver authority, not a lease
 * or originating actor. Expected protocol/transport/cancellation failures are
 * values; unexpected defects may reject and must be contained by the RTK boundary.
 */
export interface RunExecutionHistoryClient {
  readonly getExecutionHistory: (
    query: RunExecutionHistoryQuery,
    signal: AbortSignal,
  ) => Promise<RunExecutionHistoryResult>;
}
