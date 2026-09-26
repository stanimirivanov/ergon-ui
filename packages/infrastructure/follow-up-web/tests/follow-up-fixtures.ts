export const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
export const WORK_ITEM_ID = '11111111-1111-4111-8111-111111111111';
export const CASE_ID = '22222222-2222-4222-8222-222222222222';
export const RUN_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';

export function validPage() {
  return {
    items: [
      {
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
        escalationEventId: EVENT_ID,
        reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
        queueKey: 'access-restoration',
        status: 'OPEN' as const,
        openedAt: '2026-09-21T09:30:00Z',
        recordedAt: '2026-09-21T09:30:01Z',
      },
    ] as const,
    nextCursor: {
      afterOpenedAt: '2026-09-21T09:30:00Z',
      afterWorkItemId: WORK_ITEM_ID,
    },
  };
}

export function validClaim() {
  return {
    claimId: '77777777-7777-4777-8777-777777777777',
    workItemId: WORK_ITEM_ID,
    claimedAt: '2026-09-22T10:15:00Z',
    recordedAt: '2026-09-22T10:15:01Z',
  };
}

export function validOwnedPage() {
  return {
    items: [{ workItem: validPage().items[0], claim: validClaim() }],
    nextCursor: {
      afterClaimedAt: '2026-09-22T10:15:00Z',
      afterClaimId: '77777777-7777-4777-8777-777777777777',
    },
  };
}

export function validCaseSummary() {
  return {
    followUp: {
      workItemId: WORK_ITEM_ID,
      queueKey: 'access-restoration',
      escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
      openedAt: '2026-09-21T09:30:00Z',
      claimedAt: '2026-09-22T10:15:00Z',
    },
    case: {
      caseId: CASE_ID,
      goal: 'Restore access to the customer workspace',
      status: 'OPEN' as const,
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
        content: 'The sign-in link returns an expired-token message.',
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
      effectiveRisk: 'HIGH' as const,
      requiredApproval: 'RESOLVER',
      attemptNumber: 2,
      predecessorRunId: null,
      state: 'ESCALATED' as const,
      stateVersion: 3,
      stateUpdatedAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
    failedExecution: {
      connector: 'identity-stub',
      outcome: 'FAILED' as const,
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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
