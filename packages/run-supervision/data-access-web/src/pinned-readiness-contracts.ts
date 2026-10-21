import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';
import type { PinnedEvidenceFact } from './evidence-contracts';

/** Fresh Console coordinates are local consistency expectations, never HTTP authority parameters. */
export interface RunPinnedReadinessQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
  readonly caseId: string;
  readonly caseStreamVersion: number;
  readonly contractKey: string;
  readonly contractRevision: number;
}

interface ReadinessObservation {
  readonly runId: string;
  readonly caseId: string;
  readonly caseStreamVersion: number;
  readonly supervisionRevision: number;
  readonly observedAt: string;
  readonly contractKey: string;
  readonly contractRevision: number;
  /** Current version-labelled semantics on fixed inputs, not a persisted historical decision. */
  readonly evaluator: 'ergon.dev/evaluation/pinned-readiness/v1';
  /** At most one required supported binding, selected by stream order through the pin, not the first-100 history. */
  readonly selectedEvidence: readonly PinnedEvidenceFact[];
}

/** Exact equality values exist only after all requirements are present; missing names retain contract order. READY grants nothing and is not outcome proof. */
export type RunPinnedReadiness = ReadinessObservation &
  (
    | {
        readonly status: 'WAITING_FOR_EVIDENCE';
        readonly missingEvidence: readonly string[];
        readonly applicability: null;
      }
    | {
        readonly status: 'READY' | 'NOT_APPLICABLE';
        readonly missingEvidence: readonly string[];
        readonly applicability: {
          readonly fact: 'account.access.state';
          readonly expectedValue: string;
          readonly actualValue: string;
        };
      }
  );

export type RunPinnedReadinessFailure =
  RunSupervisionFailure | { readonly kind: 'readiness-unsupported' };
export type RunPinnedReadinessResult =
  | { readonly ok: true; readonly value: RunPinnedReadiness }
  | { readonly ok: false; readonly error: RunPinnedReadinessFailure };

/** Current supervisor/resolver read, including terminal work. Bounded GET retry/deadline/cancellation, no CSRF or lease. Unexpected defects may reject and must be contained at RTK. */
export interface RunPinnedReadinessClient {
  readonly getPinnedReadiness: (
    query: RunPinnedReadinessQuery,
    signal: AbortSignal,
  ) => Promise<RunPinnedReadinessResult>;
}
