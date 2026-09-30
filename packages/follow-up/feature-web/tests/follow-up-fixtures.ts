import type {
  HumanFollowUpCursor,
  HumanFollowUpResult,
  ResolverOwnedHumanFollowUpCursor,
  ResolverOwnedHumanFollowUpResult,
} from '@ergon/infrastructure-follow-up-web';
import type {
  HumanFollowUpClaim,
  HumanFollowUpWorkItem,
  ResolverFollowUpCaseSummary,
} from '@ergon/domain-follow-up';

export const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
export const FIRST_WORK_ITEM_ID = '11111111-1111-4111-8111-111111111111';
export const SECOND_WORK_ITEM_ID = '55555555-5555-4555-8555-555555555555';
export const RUN_ID = '33333333-3333-4333-8333-333333333333';

export function successfulOpenFollowUpResult(
  workItemId: string,
  nextCursor: HumanFollowUpCursor | null,
): HumanFollowUpResult {
  return {
    ok: true,
    page: {
      items: [followUpWorkItem(workItemId)],
      nextCursor,
    },
  };
}

export function successfulOwnedFollowUpResult(
  workItemId: string,
  nextCursor: ResolverOwnedHumanFollowUpCursor | null,
): ResolverOwnedHumanFollowUpResult {
  return {
    ok: true,
    page: {
      items: [
        {
          workItem: followUpWorkItem(workItemId),
          claim: followUpClaim(workItemId),
        },
      ],
      nextCursor,
    },
  };
}

export function followUpClaim(workItemId: string): HumanFollowUpClaim {
  return {
    claimId: '77777777-7777-4777-8777-777777777777',
    workItemId,
    claimedAt: '2026-09-22T10:15:00Z',
    recordedAt: '2026-09-22T10:15:01Z',
  };
}

export function resolverFollowUpCaseSummary(
  workItemId: string,
  content: string,
): ResolverFollowUpCaseSummary {
  return {
    followUp: {
      workItemId,
      queueKey: 'access-restoration',
      escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
      openedAt: '2026-09-21T09:30:00Z',
      claimedAt: '2026-09-22T10:15:00Z',
    },
    case: {
      caseId: workItemId,
      goal: 'Restore access to the customer workspace',
      status: 'OPEN',
      streamVersion: 4,
      resolutionContract: { key: 'access-restoration', revision: 2 },
    },
    observations: [
      {
        streamVersion: 1,
        eventType: 'SourceObservationRecorded',
        summary: 'Customer cannot sign in',
        observationId: '88888888-8888-4888-8888-888888888888',
        originType: 'EMAIL',
        provider: 'support-mailbox',
        reference: 'message-42',
        content,
        occurredAt: '2026-09-21T09:20:00Z',
        recordedAt: '2026-09-21T09:20:01Z',
      },
    ],
    resolutionRun: {
      runId: RUN_ID,
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
      retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
      sourceAttemptNumber: 2,
      maximumAttempts: 2,
      occurredAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
  };
}

function followUpWorkItem(workItemId: string): HumanFollowUpWorkItem {
  return {
    workItemId,
    caseId: workItemId,
    runId: RUN_ID,
    escalationEventId: '44444444-4444-4444-8444-444444444444',
    reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
    queueKey: 'access-restoration',
    status: 'OPEN',
    openedAt: '2026-09-21T09:30:00Z',
    recordedAt: '2026-09-21T09:30:01Z',
  };
}
