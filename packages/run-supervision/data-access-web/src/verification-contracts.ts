/**
 * Exact selected post-action binding/source, not the pinned prefix or a later
 * transcript. UUID identities and positive safe stream positions are validated.
 * UTC instants preserve nanosecond precision; source text/references are inert.
 * Database recording times are not supplied for these case events.
 */
export interface RunVerificationEvidence {
  readonly factId: string;
  readonly streamVersion: number;
  readonly value: 'ACTIVE' | 'LOCKED';
  readonly accountReference: string;
  readonly boundAt: string;
  readonly source: {
    readonly observationId: string;
    readonly streamVersion: number;
    readonly originType: 'CONNECTOR';
    readonly provider: string;
    readonly reference: string;
    readonly content: string;
    readonly observedAt: string;
  };
}

/** Durable runtime acceptance, not a browser decision; closure immediately follows the assessed case version. */
export interface RunProofAcceptance {
  readonly runSequence: number;
  readonly acceptedAt: string;
  readonly recordedAt: string;
  readonly caseClosureStreamVersion: number;
}

/**
 * One pinned condition. MATCHING is a mutable read at an exact case version,
 * never durable acceptance. ACCEPTED freezes evidence and the paired closure.
 * Retired with the current Console disclosure; no independent cache or authority.
 */
export type RunOutcomeVerification = {
  readonly property: 'account.access.state';
  /** Exact opaque contract value, non-blank and at most 200 UTF-16 code units; never normalized to an account-state enum. */
  readonly expectedValue: string;
} & (
  | {
      readonly status: 'NOT_ASSESSED';
      readonly reason: 'RUN_NOT_VERIFYING';
      readonly caseStreamVersion: null;
      readonly evidence: null;
      readonly acceptance: null;
    }
  | {
      readonly status: 'PENDING';
      readonly reason: 'ELIGIBLE_EVIDENCE_MISSING';
      readonly caseStreamVersion: number;
      readonly evidence: null;
      readonly acceptance: null;
    }
  | {
      readonly status: 'PENDING';
      readonly reason: 'VALUE_MISMATCH';
      readonly caseStreamVersion: number;
      readonly evidence: RunVerificationEvidence;
      readonly acceptance: null;
    }
  | {
      readonly status: 'MATCHING';
      readonly reason: null;
      readonly caseStreamVersion: number;
      readonly evidence: RunVerificationEvidence;
      readonly acceptance: null;
    }
  | {
      readonly status: 'ACCEPTED';
      readonly reason: null;
      readonly caseStreamVersion: number;
      readonly evidence: RunVerificationEvidence;
      readonly acceptance: RunProofAcceptance;
    }
);
