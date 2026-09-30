import { describe, expect, it } from 'vitest';

import {
  isResolverFollowUpCaseSummary,
  type ResolverFollowUpCaseSummaryCandidate,
} from '../src';

function validSummary(): ResolverFollowUpCaseSummaryCandidate {
  return {
    followUp: {
      workItemId: 'work-1',
      queueKey: 'access-restoration',
      escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
      openedAt: '2026-09-21T09:30:00Z',
      claimedAt: '2026-09-22T10:15:00Z',
    },
    case: {
      caseId: 'case-1',
      goal: 'Restore access',
      status: 'OPEN',
      streamVersion: 4,
      resolutionContract: { key: 'access-restoration', revision: 2 },
    },
    observations: [
      {
        streamVersion: 1,
        eventType: 'SourceObservationRecorded',
        summary: 'Customer cannot sign in',
        observationId: 'observation-1',
        originType: 'EMAIL',
        provider: 'support-mailbox',
        reference: null,
        content: 'Sign-in link expired.',
        occurredAt: '2026-09-21T09:20:00Z',
        recordedAt: '2026-09-21T09:20:01Z',
      },
    ],
    resolutionRun: {
      runId: 'run-1',
      caseEvidenceStreamVersion: 4,
      contractKey: 'access-restoration',
      contractRevision: 2,
      policyRevision: 'policy-7',
      stepId: 'verify-account-owner',
      capability: 'identity.lookup',
      effectiveRisk: 'HIGH',
      requiredApproval: 'RESOLVER',
      attemptNumber: 2,
      predecessorRunId: null,
      state: 'ESCALATED',
      stateVersion: 3,
      stateUpdatedAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
    failedExecution: {
      connector: 'identity-stub',
      outcome: 'FAILED',
      completedAt: '2026-09-21T09:29:30Z',
      recordedAt: '2026-09-21T09:29:31Z',
    },
    escalation: {
      retryPolicyRevision: 'retry-v1',
      sourceAttemptNumber: 2,
      maximumAttempts: 2,
      occurredAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
  };
}

function firstObservation(
  summary: ResolverFollowUpCaseSummaryCandidate,
): ResolverFollowUpCaseSummaryCandidate['observations'][number] {
  const observation = summary.observations[0];
  if (observation === undefined) {
    throw new Error('The test fixture must include one observation.');
  }
  return observation;
}

describe('resolver follow-up case-summary refinement', () => {
  it('accepts coherent context without changing its value', () => {
    const summary = validSummary();

    expect(isResolverFollowUpCaseSummary(summary)).toBe(true);
  });

  it.each([
    [
      'missing pinned contract',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        case: { ...s.case, resolutionContract: null },
      }),
    ],
    [
      'mismatched contract key',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        resolutionRun: { ...s.resolutionRun, contractKey: 'other' },
      }),
    ],
    [
      'mismatched contract revision',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        resolutionRun: { ...s.resolutionRun, contractRevision: 3 },
      }),
    ],
    [
      'evidence beyond the case stream',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        resolutionRun: { ...s.resolutionRun, caseEvidenceStreamVersion: 5 },
      }),
    ],
    [
      'non-positive case revision',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        case: { ...s.case, streamVersion: 0 },
      }),
    ],
    [
      'fractional run revision',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        resolutionRun: { ...s.resolutionRun, stateVersion: 1.5 },
      }),
    ],
    [
      'handoff for another attempt',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        escalation: { ...s.escalation, sourceAttemptNumber: 1 },
      }),
    ],
    [
      'handoff before the retry limit',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        escalation: { ...s.escalation, maximumAttempts: 3 },
      }),
    ],
    [
      'handoff at a different opening time',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        escalation: { ...s.escalation, occurredAt: '2026-09-21T09:30:01Z' },
      }),
    ],
    [
      'failure after handoff',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        failedExecution: {
          ...s.failedExecution,
          completedAt: '2026-09-21T09:30:01Z',
        },
      }),
    ],
    [
      'observation beyond case stream',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        observations: [{ ...firstObservation(s), streamVersion: 5 }],
      }),
    ],
    [
      'unordered observations',
      (s: ResolverFollowUpCaseSummaryCandidate) => ({
        ...s,
        observations: [
          { ...firstObservation(s), streamVersion: 2 },
          { ...firstObservation(s), streamVersion: 1 },
        ],
      }),
    ],
  ] as const)('rejects %s', (_, change) => {
    expect(isResolverFollowUpCaseSummary(change(validSummary()))).toBe(false);
  });
});
