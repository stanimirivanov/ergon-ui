/** Active discovery excludes completed, superseded, and escalated runs. */
export type ActiveRunState =
  | 'WAITING_FOR_APPROVAL'
  | 'READY_FOR_AUTHORIZATION'
  | 'VERIFYING'
  | 'ACTION_FAILED';

/** Recorded current state; a terminal state is not a browser proof payload. */
export type AssignedRunState =
  ActiveRunState | 'VERIFIED_RESOLVED' | 'SUPERSEDED' | 'ESCALATED';

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
 * Read-only pinned start and current state from the assigned-only browser BFF.
 *
 * Positive contract/evidence revisions identify the start snapshot. Risk and
 * approval are prerequisites, not an approval receipt or execution permission.
 * `predecessorRunId` is null on the first attempt. This projection contains no
 * evidence text, execution spans, control lease, or outcome-proof material.
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
        | 'unexpected-defect';
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
