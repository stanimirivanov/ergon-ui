import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/** Exact private coordinates. The safe nonnegative epoch is a local expectation, never a sent authority parameter. */
export interface RunInvocationHistoryQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
}

/** Measured gateway return/exception, not an independent outcome proof or the winning receipt. UTC may backstep; duration is monotonic. */
export interface RunInvocationCompletion {
  readonly outcome: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  readonly completedAt: string;
  readonly recordedAt: string;
  readonly timing: {
    readonly source: 'ergon.dev/measurement/connector-call/v1';
    readonly startedAt: string;
    /** Canonical nonnegative signed-Long decimal string; preserve precision without Number coercion. */
    readonly elapsedNanoseconds: string;
  };
}

/** A committed preparation before possible I/O, not proof of dispatch. Null completion means no completion recorded, never live work or no effect. */
export interface RunInvocationPreparation {
  readonly stepId: string;
  readonly capability: string;
  readonly connector: string;
  readonly preparedAt: string;
  readonly recordedAt: string;
  readonly completion: RunInvocationCompletion | null;
}

/**
 * Partial recorded coverage, including prior supervisor epochs/internal work.
 * Preserve server order without causal inference or stable cross-read prefix.
 * At most 100 entries; empty does not exclude historical/older-writer effects.
 */
export interface RunInvocationHistory {
  readonly observedAt: string;
  readonly supervisionRevision: number;
  readonly entries: readonly RunInvocationPreparation[];
  readonly truncated: boolean;
}

export type RunInvocationHistoryFailure =
  RunSupervisionFailure | { readonly kind: 'history-unsupported' };
export type RunInvocationHistoryResult =
  | { readonly ok: true; readonly value: RunInvocationHistory }
  | { readonly ok: false; readonly error: RunInvocationHistoryFailure };

/** Current supervisor/resolver read, without control/CSRF or recovery rights. Expected failures are values; unexpected defects can reject and must be contained at RTK. */
export interface RunInvocationHistoryClient {
  readonly getInvocationHistory: (
    query: RunInvocationHistoryQuery,
    signal: AbortSignal,
  ) => Promise<RunInvocationHistoryResult>;
}
