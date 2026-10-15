/**
 * At most 100 historical bindings within the run's pinned case prefix, not current
 * truth, confidence or outcome proof. Identities are UUIDs, stream positions are
 * positive safe integers and all timestamps are ISO-8601 UTC instants.
 */
export interface PinnedRunEvidence {
  readonly caseId: string;
  readonly caseStreamVersion: number;
  readonly facts: readonly PinnedEvidenceFact[];
  /** True means later bindings inside the same prefix were omitted; no complete-history claim is possible. */
  readonly truncated: boolean;
}

/** A stored account-access binding; occurrence and recording instants must not be conflated. */
export interface PinnedEvidenceFact {
  readonly factId: string;
  readonly streamVersion: number;
  readonly property: 'account.access.state';
  readonly accountReference: string;
  readonly value: 'ACTIVE' | 'LOCKED';
  readonly boundAt: string;
  readonly recordedAt: string;
  readonly source: PinnedEvidenceSource;
}

/** Only the binding's exact source is disclosed. Content and opaque references are untrusted text, never instructions or links. */
export interface PinnedEvidenceSource {
  readonly observationId: string;
  readonly streamVersion: number;
  readonly originType: 'CONNECTOR';
  readonly provider: string;
  readonly reference: string;
  readonly content: string;
  readonly observedAt: string;
  readonly recordedAt: string;
}
