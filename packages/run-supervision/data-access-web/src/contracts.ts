import type { RunApprovalReview } from './approval-contracts';
import type { PinnedRunEvidence } from './evidence-contracts';
import type { RunOutcomeVerification } from './verification-contracts';

/** Active discovery excludes all terminal runs, including cancellation. */
export type ActiveRunState =
  | 'WAITING_FOR_APPROVAL'
  | 'READY_FOR_AUTHORIZATION'
  | 'VERIFYING'
  | 'ACTION_FAILED';

/** Recorded current state; a terminal state is not a browser proof payload. */
export type AssignedRunState =
  | ActiveRunState
  | 'VERIFIED_RESOLVED'
  | 'SUPERSEDED'
  | 'ESCALATED'
  | 'CANCELLED';

/**
 * A durable assignment visible to the verified actor, not a timed control lease.
 * Times are ISO-8601 UTC instants. State revisions are non-negative safe integers.
 */
export interface AssignedRunOverview {
  readonly runId: string;
  readonly caseId: string;
  readonly state: ActiveRunState;
  readonly stateVersion: number;
  readonly stateUpdatedAt: string;
  readonly assignedAt: string;
  /** Missing only on older servers; independent of the run-state revision. */
  readonly supervisionRevision?: number;
}

/** Preserve both opaque keyset values together; never derive a cursor from a row. */
export interface AssignedRunCursor {
  readonly assignedAt: string;
  readonly assignmentId: string;
}

/** Server-ordered assigned active runs, with no changing total count. */
export interface AssignedRunPage {
  readonly entries: readonly AssignedRunOverview[];
  readonly nextCursor: AssignedRunCursor | null;
}

/**
 * Winning receipt caller's monotonic gateway-call measurement, not provider
 * operation latency, retries, billing or proof. Nanoseconds remain a canonical
 * decimal string (0–Long.MAX_VALUE) so the RTK cache is exact and serializable.
 * Wall-clock correction may place startedAt after completion; never subtract
 * these instants to derive elapsed time. Units do not promise clock resolution.
 */
export interface AssignedRunExecutionTiming {
  readonly source: 'ergon.dev/measurement/connector-call/v1';
  readonly startedAt: string;
  readonly elapsedNanoseconds: string;
}

/**
 * Sanitized immutable terminal receipt for the Console's pinned step/capability.
 * Null timing means unmeasured, including older writers; it is not measured zero.
 * Recording is independent of current run-state projection and outcome proof.
 * Contains no provider references, payloads or authorization coordinates.
 */
export interface AssignedRunExecution {
  readonly stepId: string;
  readonly capability: string;
  readonly connector: string;
  readonly outcome: 'SUCCEEDED' | 'FAILED';
  readonly completedAt: string;
  readonly recordedAt: string;
  readonly timing: AssignedRunExecutionTiming | null;
}

/**
 * Immutable state-transition metadata through the Console's returned revision.
 * Sequence is authoritative order; UTC occurrence/recording instants need not
 * increase after clock correction. No event/actor/authority/provider identifiers
 * or proof payload are included. Current runtime histories contain at most two
 * transitions, not a multi-step span tree.
 */
export interface AssignedRunTransition {
  readonly sequence: number;
  readonly type:
    | 'CAPABILITY_SUCCEEDED'
    | 'CAPABILITY_FAILED'
    | 'OUTCOME_PROOF_ACCEPTED'
    | 'RETRY_STARTED'
    | 'ESCALATION_REQUESTED'
    | 'RUN_CANCELLED';
  readonly fromState: AssignedRunState;
  readonly toState: AssignedRunState;
  readonly occurredAt: string;
  readonly recordedAt: string;
}

/**
 * Read-only pinned start and current state from the assigned-only browser BFF.
 *
 * Positive contract/evidence revisions identify the start snapshot. Risk and
 * approval are prerequisites, not an approval receipt or execution permission.
 * `predecessorRunId` is null on the first attempt. Post-pin evidence is restricted
 * to the exact outcome assessment/acceptance citation; no unrelated history,
 * execution spans or control lease is included.
 */
export interface AssignedRunConsole {
  readonly runId: string;
  readonly caseId: string;
  readonly caseEvidenceStreamVersion: number;
  readonly contractKey: string;
  readonly contractRevision: number;
  readonly policyRevision: string;
  readonly stepId: string;
  readonly capability: string;
  readonly effectiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly requiredApproval: 'NONE' | 'REQUESTER' | 'RESOLVER';
  readonly attemptNumber: number;
  readonly predecessorRunId: string | null;
  readonly startedRecordedAt: string;
  readonly state: AssignedRunState;
  readonly stateVersion: number;
  readonly stateUpdatedAt: string;
  readonly assignedAt: string;
  /**
   * Missing on older servers: projection unsupported/unknown. Null: no terminal
   * receipt recorded, not proof that no external effect occurred. Present:
   * exactly attributed result, never authority, state advancement or proof.
   */
  readonly execution?: AssignedRunExecution | null;
  /** Missing on older servers means unsupported history, not an empty stream. */
  readonly transitions?: readonly AssignedRunTransition[];
  /** Paired rollout metadata. Omitted on older servers; never inferred from assignment alone. */
  readonly supervisionRevision?: number;
  readonly handoverSupported?: boolean;
  /** Omission is older-server unsupported; false is an explicitly disabled rollout, not missing proof. */
  readonly proofFinalizationSupported?: boolean;
  /** Missing on older servers means unsupported, not an absent request. No private attribution is included. */
  readonly approvalReview?: RunApprovalReview;
  /** Missing on older servers means unsupported, not an empty snapshot. Retired with the exact Console disclosure gate. */
  readonly pinnedEvidence?: PinnedRunEvidence;
  /** Omission means an older server, not unassessed or pending proof. Null/malformed proof fails the entire read. */
  readonly outcomeVerification?: RunOutcomeVerification;
}

/** Tenant is navigation context only. Limit defaults to 30 and must be 1–100. */
export interface AssignedRunQuery {
  readonly tenantId: string;
  readonly limit?: number;
  readonly cursor?: AssignedRunCursor;
}

/** Exact tenant/run cache identity; the BFF independently checks assignment and authority. */
export interface AssignedRunConsoleQuery {
  readonly tenantId: string;
  readonly runId: string;
}

/**
 * Safe serializable failures without raw response details or browser causes.
 * `not-found` does not distinguish missing runs from denied assignment/authority.
 * Authentication-required is recognized only with the fixed local sign-in path.
 * `unexpected-defect` contains a client/composition defect at the cache boundary;
 * it carries no diagnostic cause and is not an automatically retryable read.
 */
export type RunSupervisionFailure =
  | {
      readonly kind:
        | 'authentication-required'
        | 'authentication-unavailable'
        | 'actor-not-registered'
        | 'identity-rejected'
        | 'forbidden'
        | 'not-found'
        | 'invalid-page'
        | 'invalid-response'
        | 'transport'
        | 'timeout'
        | 'request-cancelled'
        | 'unexpected-defect'
        | 'control-required'
        | 'control-conflict'
        | 'control-disabled'
        | 'control-unavailable';
    }
  | {
      readonly kind: 'service-unavailable' | 'unexpected-http-status';
      readonly status: number;
    };

export type AssignedRunListResult =
  | { readonly ok: true; readonly page: AssignedRunPage }
  | { readonly ok: false; readonly error: RunSupervisionFailure };

export type AssignedRunConsoleResult =
  | { readonly ok: true; readonly console: AssignedRunConsole }
  | { readonly ok: false; readonly error: RunSupervisionFailure };

/**
 * Interruptible read operations. Expected transport/protocol failures are values;
 * unexpected defects reject. Neither method authorizes, assigns, or controls runs.
 */
export interface RunSupervisionClient {
  readonly listAssigned: (
    query: AssignedRunQuery,
    signal: AbortSignal,
  ) => Promise<AssignedRunListResult>;
  readonly getConsole: (
    query: AssignedRunConsoleQuery,
    signal: AbortSignal,
  ) => Promise<AssignedRunConsoleResult>;
}
