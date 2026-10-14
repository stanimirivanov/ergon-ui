import type { RunSupervisionFailure } from './contracts';

/** Human prerequisite only. Neither outcome grants, invokes, resumes or verifies a capability. */
export type RunApprovalOutcome = 'APPROVED' | 'REJECTED';

/** Immutable, sanitized latest request. Authority must exactly match the pinned requirement; times are UTC instants. */
export interface RunApprovalRequest {
  readonly requestId: string;
  readonly authority: 'REQUESTER' | 'RESOLVER';
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly recordedAt: string;
}

/** Historical response, not current eligibility; contains no actor or attestation identity. */
export interface RunApprovalDecision {
  readonly decisionId: string;
  readonly outcome: RunApprovalOutcome;
  readonly decidedAt: string;
  readonly recordedAt: string;
}

/**
 * Server-observed lifecycle in the gated Console projection. canDecide is true
 * only for PENDING/current WAITING_FOR_APPROVAL with matching scoped authority
 * and enabled rollout; the server independently rechecks on submission.
 * DECIDED outranks expiry because the response remains historical evidence.
 */
export interface RunApprovalReview {
  readonly status:
    'NOT_REQUIRED' | 'NOT_REQUESTED' | 'PENDING' | 'EXPIRED' | 'DECIDED';
  readonly observedAt: string;
  readonly canDecide: boolean;
  readonly request: RunApprovalRequest | null;
  readonly decision: RunApprovalDecision | null;
}

/** Retain this complete tuple for explicit uncertain-result replay; never replace its ID, outcome or epoch. */
export interface RunApprovalCommand {
  readonly tenantId: string;
  readonly runId: string;
  readonly requestId: string;
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly outcome: RunApprovalOutcome;
}

/** Exact persisted acknowledgement; supervision revision is unchanged by this decision. */
export interface RunApprovalReceipt extends RunApprovalDecision {
  readonly commandId: string;
  readonly runId: string;
  readonly requestId: string;
  readonly supervisionRevision: number;
}

export type RunApprovalFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'approval-disabled'
        | 'approval-conflict'
        | 'approval-authority-missing'
        | 'invalid-approval'
        | 'csrf-rejected';
    };
export type RunApprovalResult =
  | { readonly ok: true; readonly receipt: RunApprovalReceipt }
  | { readonly ok: false; readonly error: RunApprovalFailure };

/** Invocation-local CSRF and one bounded command attempt. No automatic retry; defects reject for RTK containment. */
export interface RunApprovalClient {
  readonly decideApproval: (
    command: RunApprovalCommand,
    signal: AbortSignal,
  ) => Promise<RunApprovalResult>;
}
