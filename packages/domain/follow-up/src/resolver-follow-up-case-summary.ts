/**
 * Evidence snapshot authorized for the resolver who owns a follow-up.
 *
 * The snapshot binds one open case, escalated resolution run, failed connector
 * execution, and retry-exhaustion event. Its resolution contract matches the
 * run contract; the run's evidence version does not exceed the case stream;
 * observations are strictly stream-version ordered within that boundary; and
 * the escalation attempt matches the run attempt and has reached the configured
 * maximum. All time values are validated UTC instants.
 *
 * The value contains case evidence and must not be persisted in browser
 * storage, URLs, logs, or analytics.
 */
export interface ResolverFollowUpCaseSummary {
  readonly followUp: {
    readonly workItemId: string;
    readonly queueKey: string;
    readonly escalationReason: string;
    readonly openedAt: string;
    readonly claimedAt: string;
  };
  readonly case: {
    readonly caseId: string;
    readonly goal: string;
    readonly status: 'OPEN';
    readonly streamVersion: number;
    readonly resolutionContract: {
      readonly key: string;
      readonly revision: number;
    };
  };
  /** Evidence in strictly increasing stream-version order. */
  readonly observations: readonly {
    readonly streamVersion: number;
    readonly eventType: string;
    readonly summary: string;
    readonly observationId: string;
    readonly originType: string;
    readonly provider: string;
    readonly reference: string | null;
    readonly content: string;
    readonly occurredAt: string;
    readonly recordedAt: string;
  }[];
  readonly resolutionRun: {
    readonly runId: string;
    /** Highest case stream version visible to this resolution attempt. */
    readonly caseEvidenceStreamVersion: number;
    readonly contractKey: string;
    readonly contractRevision: number;
    readonly policyRevision: string;
    readonly stepId: string;
    readonly capability: string;
    readonly effectiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    readonly requiredApproval: string;
    readonly attemptNumber: number;
    readonly predecessorRunId: string | null;
    readonly state: 'ESCALATED';
    readonly stateVersion: number;
    readonly stateUpdatedAt: string;
    readonly recordedAt: string;
  };
  readonly failedExecution: {
    readonly connector: string;
    readonly outcome: 'FAILED';
    readonly completedAt: string;
    readonly recordedAt: string;
  };
  readonly escalation: {
    readonly retryPolicyRevision: string;
    /** Attempt that failed and caused this human handoff. */
    readonly sourceAttemptNumber: number;
    readonly maximumAttempts: number;
    readonly occurredAt: string;
    readonly recordedAt: string;
  };
}
