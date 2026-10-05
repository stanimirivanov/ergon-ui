import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

const workItemId = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';
const runId = '33333333-3333-4333-8333-333333333333';
const predecessorRunId = '55555555-5555-4555-8555-555555555555';

const workItem = {
  workItemId,
  caseId,
  runId,
  escalationEventId: '44444444-4444-4444-8444-444444444444',
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
  queueKey: 'access-restoration',
  status: 'OPEN',
  openedAt: '2026-09-21T09:30:00Z',
  recordedAt: '2026-09-21T09:30:01Z',
  ownershipRevision: 1,
} as const;

const claim = {
  claimId: '77777777-7777-4777-8777-777777777777',
  workItemId,
  claimedAt: '2026-09-22T10:15:00Z',
  recordedAt: '2026-09-22T10:15:01Z',
} as const;

const summary = {
  followUp: {
    workItemId,
    queueKey: workItem.queueKey,
    escalationReason: workItem.reason,
    openedAt: workItem.openedAt,
    claimedAt: claim.claimedAt,
  },
  case: {
    caseId,
    goal: 'Restore access to the customer workspace',
    status: 'OPEN',
    streamVersion: 5,
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
    {
      streamVersion: 5,
      eventType: 'SourceObservationRecorded',
      summary: 'Later SSO diagnostic received',
      observationId: '99999999-9999-4999-8999-999999999999',
      originType: 'SYSTEM',
      provider: 'sso-diagnostics',
      reference: 'session-audit-7',
      content: 'A later SSO check reported a disabled browser session.',
      occurredAt: '2026-09-21T09:32:00Z',
      recordedAt: '2026-09-21T09:32:01Z',
    },
  ],
  resolutionRun: {
    runId,
    caseEvidenceStreamVersion: 4,
    contractKey: 'access-restoration',
    contractRevision: 2,
    policyRevision: 'policy-7',
    stepId: 'verify-account-owner',
    capability: 'identity.lookup',
    effectiveRisk: 'HIGH',
    requiredApproval: 'RESOLVER',
    attemptNumber: 2,
    predecessorRunId,
    state: 'ESCALATED',
    stateVersion: 2,
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
  runHistory: {
    attempts: [
      {
        runId: predecessorRunId,
        attemptNumber: 1,
        predecessorRunId: null,
        startedRecordedAt: '2026-09-21T09:25:00Z',
        state: 'SUPERSEDED',
        stateVersion: 2,
        stateUpdatedAt: '2026-09-21T09:27:00Z',
        capabilityResult: {
          sequence: 1,
          fromState: 'READY_FOR_AUTHORIZATION',
          toState: 'ACTION_FAILED',
          connector: 'identity-stub',
          outcome: 'FAILED',
          completedAt: '2026-09-21T09:26:00Z',
          recordedAt: '2026-09-21T09:26:02Z',
        },
        retry: {
          sequence: 2,
          replacementRunId: runId,
          occurredAt: '2026-09-21T09:27:00Z',
          recordedAt: '2026-09-21T09:27:01Z',
        },
      },
      {
        runId,
        attemptNumber: 2,
        predecessorRunId,
        startedRecordedAt: '2026-09-21T09:28:00Z',
        state: 'ESCALATED',
        stateVersion: 2,
        stateUpdatedAt: '2026-09-21T09:30:00Z',
        capabilityResult: {
          sequence: 1,
          fromState: 'READY_FOR_AUTHORIZATION',
          toState: 'ACTION_FAILED',
          connector: 'identity-stub',
          outcome: 'FAILED',
          completedAt: '2026-09-21T09:29:30Z',
          recordedAt: '2026-09-21T09:29:32Z',
        },
        retry: null,
      },
    ],
  },
  outcomeProof: {
    fact: 'account.access.state',
    expectedValue: 'ACTIVE',
    assessmentStatus: 'NOT_ASSESSED',
    reason: 'RUN_NOT_VERIFYING',
  },
} as const;

/**
 * Serves one synthetic owned item, then withholds the second context read
 * until the scenario has proved old evidence is hidden during revalidation.
 * A neutral 404 and a later empty owned page illustrate one possible change,
 * not the reason a real resolver lost access.
 */
export async function installSimulatedOwnedContextBff(page: Page): Promise<{
  summaryReads: () => number;
  ownedReads: () => number;
  claimCommands: () => number;
  denyPendingSummary: () => void;
}> {
  let ownedVisible = true;
  let summaryReads = 0;
  let ownedReads = 0;
  let claimCommands = 0;
  let finishPendingRead: () => void = () => undefined;
  const pendingRead = new Promise<void>((resolve) => {
    finishPendingRead = resolve;
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/claim-commands')) {
      claimCommands += 1;
    }
  });

  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) => {
    ownedReads += 1;
    return fulfillSimulatedBff(route, {
      items: ownedVisible ? [{ workItem, claim }] : [],
      nextCursor: null,
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8/human-follow-ups/${workItemId}/case-summary`,
      );
      summaryReads += 1;
      if (summaryReads === 1) {
        await fulfillSimulatedBff(route, summary);
        return;
      }
      if (summaryReads !== 2) {
        throw new Error('Unexpected synthetic case-summary read.');
      }
      await pendingRead;
      await fulfillSimulatedBff(
        route,
        {
          type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
          title: 'Case context unavailable',
          status: 404,
        },
        404,
      );
    },
  );

  return {
    summaryReads: () => summaryReads,
    ownedReads: () => ownedReads,
    claimCommands: () => claimCommands,
    denyPendingSummary: () => {
      if (summaryReads !== 2) {
        throw new Error('The revalidation request has not started.');
      }
      ownedVisible = false;
      finishPendingRead();
    },
  };
}
