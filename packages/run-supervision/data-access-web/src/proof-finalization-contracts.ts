import type { FencedRunCommand } from './control-contracts';
import type { RunSupervisionFailure } from './contracts';

/** Exact reviewed intent; reuse every coordinate on uncertain replay. Actor and acceptance time are session/server-owned. */
export interface RunProofFinalizationCommand extends FencedRunCommand {
  readonly tenantId: string;
  readonly runId: string;
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
  readonly expectedCaseVersion: number;
  readonly factId: string;
  readonly observationId: string;
}

/** Historical acknowledgement of atomic proof/run/case completion, not current supervision or a fresh external check. */
export interface RunProofFinalizationReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly supervisionRevision: number;
  readonly expectedRunVersion: number;
  readonly assessedCaseVersion: number;
  readonly factId: string;
  readonly observationId: string;
  readonly runSequence: 2;
  readonly caseClosureStreamVersion: number;
  readonly acceptedAt: string;
  readonly recordedAt: string;
}

export type RunProofFinalizationFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'proof-finalization-disabled'
        | 'proof-finalization-conflict'
        | 'invalid-proof-finalization'
        | 'csrf-rejected';
    };

export type RunProofFinalizationResult =
  | { readonly ok: true; readonly receipt: RunProofFinalizationReceipt }
  | { readonly ok: false; readonly error: RunProofFinalizationFailure };

/** One deadline covers fresh CSRF, POST and decoding. No automatic retry; cancellation may leave a committed result requiring exact replay. Defects reject for RTK containment. */
export interface RunProofFinalizationClient {
  finalizeProof(
    command: RunProofFinalizationCommand,
    signal: AbortSignal,
  ): Promise<RunProofFinalizationResult>;
}
