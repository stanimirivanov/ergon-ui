import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/** Exact immutable pin from the fresh Console. Expectations stay local, never sent as authority parameters. */
export interface RunPinnedContractQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
  readonly contractKey: string;
  readonly contractRevision: number;
  readonly stepId: string;
  readonly capability: string;
}

/** Exact case-sensitive equality declaration, not assessed evidence or accepted proof. */
export interface ContractCondition {
  readonly fact: string;
  readonly equals: string;
}

/** Declared safeguards, not effective policy, approval decisions or capability grants. */
export interface ContractStep {
  readonly id: string;
  readonly capability: string;
  readonly risk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly approval: 'NONE' | 'REQUESTER' | 'RESOLVER';
}

/** Normalized immutable meaning, never reconstructed original YAML. Unique evidence/steps contain 1–50 entries in declaration order. */
export interface RunPinnedContract {
  readonly runId: string;
  readonly supervisionRevision: number;
  readonly observedAt: string;
  readonly pinnedStepId: string;
  /** Database recording metadata, not an execution timestamp or duration input. UTC may backstep. */
  readonly contractRecordedAt: string;
  readonly contract: {
    readonly schema: 'ergon.dev/resolution-contract/v1alpha1';
    readonly key: string;
    readonly revision: number;
    readonly applicability: ContractCondition;
    readonly requiredEvidence: readonly string[];
    readonly steps: readonly ContractStep[];
    readonly outcomeProof: ContractCondition;
  };
}

export type RunPinnedContractFailure =
  RunSupervisionFailure | { readonly kind: 'contract-unsupported' };
export type RunPinnedContractResult =
  | { readonly ok: true; readonly value: RunPinnedContract }
  | { readonly ok: false; readonly error: RunPinnedContractFailure };

/** Read-only current supervisor/resolver observation, including terminal attempts. Bounded GET retry/timeout/cancellation; no CSRF or lease. Unexpected defects may reject and must be contained at RTK. */
export interface RunPinnedContractClient {
  readonly getPinnedContract: (
    query: RunPinnedContractQuery,
    signal: AbortSignal,
  ) => Promise<RunPinnedContractResult>;
}
