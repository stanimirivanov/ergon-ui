/**
 * Evidence snapshot authorized for the resolver who owns a follow-up.
 *
 * The snapshot binds one open case, escalated resolution run, failed connector
 * execution, retry-exhaustion event, complete ordered attempt chain, and
 * pinned-but-unassessed success condition. Its resolution contract matches the
 * run contract; the run's evidence version does not exceed the case stream;
 * observations are strictly ordered within the current case stream (they may
 * postdate the run's pinned evidence boundary); and
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
  /** Durable run attempts in ascending attempt-number order. */
  readonly runHistory: {
    readonly attempts: readonly {
      readonly runId: string;
      readonly attemptNumber: number;
      readonly predecessorRunId: string | null;
      readonly startedRecordedAt: string;
      readonly state: 'SUPERSEDED' | 'ESCALATED';
      readonly stateVersion: number;
      readonly stateUpdatedAt: string;
      readonly capabilityResult: {
        readonly sequence: number;
        readonly fromState: 'WAITING_FOR_APPROVAL' | 'READY_FOR_AUTHORIZATION';
        readonly toState: 'ACTION_FAILED';
        readonly connector: string;
        readonly outcome: 'FAILED';
        readonly completedAt: string;
        readonly recordedAt: string;
      };
      /** Present only when this attempt durably spawned the next attempt. */
      readonly retry: {
        readonly sequence: number;
        readonly replacementRunId: string;
        readonly occurredAt: string;
        readonly recordedAt: string;
      } | null;
    }[];
  };
  /** The pinned success condition, not a claim that verification succeeded. */
  readonly outcomeProof: {
    readonly fact: string;
    readonly expectedValue: string;
    readonly assessmentStatus: 'NOT_ASSESSED';
    readonly reason: 'RUN_NOT_VERIFYING';
  };
}

/**
 * Structurally decoded case context before its cross-field invariants are
 * established. A missing pinned contract is representable here but never in
 * a resolver-visible summary.
 */
export type ResolverFollowUpCaseSummaryCandidate = Omit<
  ResolverFollowUpCaseSummary,
  'case'
> & {
  readonly case: Omit<
    ResolverFollowUpCaseSummary['case'],
    'resolutionContract'
  > & {
    readonly resolutionContract:
      ResolverFollowUpCaseSummary['case']['resolutionContract'] | null;
  };
};

/**
 * Refines structurally decoded, server-authorized context into a coherent
 * case/run/evidence/handoff/proof projection. This does not establish that the
 * caller owns the work item or that the response matches a particular request;
 * those checks remain at the BFF boundary. Invalid candidates return false.
 */
export function isResolverFollowUpCaseSummary(
  summary: ResolverFollowUpCaseSummaryCandidate,
): summary is ResolverFollowUpCaseSummary {
  const contract = summary.case.resolutionContract;
  const positiveIntegers = [
    summary.case.streamVersion,
    summary.resolutionRun.caseEvidenceStreamVersion,
    summary.resolutionRun.contractRevision,
    summary.resolutionRun.attemptNumber,
    summary.resolutionRun.stateVersion,
    summary.escalation.sourceAttemptNumber,
    summary.escalation.maximumAttempts,
    ...summary.runHistory.attempts.flatMap((attempt) => [
      attempt.attemptNumber,
      attempt.stateVersion,
      attempt.capabilityResult.sequence,
      ...(attempt.retry === null ? [] : [attempt.retry.sequence]),
    ]),
    ...summary.observations.map((observation) => observation.streamVersion),
  ];

  return (
    contract !== null &&
    contract.key === summary.resolutionRun.contractKey &&
    contract.revision === summary.resolutionRun.contractRevision &&
    summary.resolutionRun.caseEvidenceStreamVersion <=
      summary.case.streamVersion &&
    positiveIntegers.every(isPositiveInteger) &&
    summary.escalation.sourceAttemptNumber ===
      summary.resolutionRun.attemptNumber &&
    summary.escalation.sourceAttemptNumber ===
      summary.escalation.maximumAttempts &&
    summary.escalation.occurredAt === summary.followUp.openedAt &&
    Date.parse(summary.failedExecution.completedAt) <=
      Date.parse(summary.escalation.occurredAt) &&
    summary.observations.every((observation, index, observations) => {
      const previousObservation = observations[index - 1];
      return (
        observation.streamVersion <= summary.case.streamVersion &&
        (previousObservation === undefined ||
          previousObservation.streamVersion < observation.streamVersion)
      );
    }) &&
    hasCoherentRunHistory(summary)
  );
}

function hasCoherentRunHistory(
  summary: ResolverFollowUpCaseSummaryCandidate,
): boolean {
  const attempts = summary.runHistory.attempts;
  const first = attempts[0];
  const last = attempts.at(-1);
  return (
    first !== undefined &&
    first.attemptNumber === 1 &&
    first.predecessorRunId === null &&
    attempts.length === summary.resolutionRun.attemptNumber &&
    last !== undefined &&
    last.runId === summary.resolutionRun.runId &&
    last.attemptNumber === summary.resolutionRun.attemptNumber &&
    last.state === summary.resolutionRun.state &&
    last.stateVersion === summary.resolutionRun.stateVersion &&
    last.stateUpdatedAt === summary.resolutionRun.stateUpdatedAt &&
    last.capabilityResult.connector === summary.failedExecution.connector &&
    last.capabilityResult.completedAt === summary.failedExecution.completedAt &&
    last.retry === null &&
    last.stateUpdatedAt === summary.escalation.occurredAt &&
    attempts.every((attempt, index) => {
      const previous = attempts[index - 1];
      const next = attempts[index + 1];
      return (
        attempt.capabilityResult.sequence === 1 &&
        (attempt.retry === null ||
          (attempt.retry.sequence === 2 &&
            attempt.stateVersion === attempt.retry.sequence &&
            attempt.stateUpdatedAt === attempt.retry.occurredAt)) &&
        (previous === undefined ||
          (attempt.attemptNumber === previous.attemptNumber + 1 &&
            attempt.predecessorRunId === previous.runId)) &&
        (next === undefined
          ? attempt.retry === null && attempt.state === 'ESCALATED'
          : attempt.state === 'SUPERSEDED' &&
            attempt.retry?.replacementRunId === next.runId)
      );
    })
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
