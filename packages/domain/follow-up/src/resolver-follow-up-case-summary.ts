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
    readonly sourceAttemptNumber: number;
    readonly maximumAttempts: number;
    readonly occurredAt: string;
    readonly recordedAt: string;
  };
}
