import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

const workItemId = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';
const runId = '33333333-3333-4333-8333-333333333333';
const predecessorRunId = '55555555-5555-4555-8555-555555555555';
const claimId = '77777777-7777-4777-8777-777777777777';

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
} as const;

const claim = {
  claimId,
  workItemId,
  claimedAt: '2026-09-22T10:15:00Z',
  recordedAt: '2026-09-22T10:15:01Z',
} as const;

const caseSummary = {
  followUp: {
    workItemId,
    queueKey: 'access-restoration',
    escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
    openedAt: '2026-09-21T09:30:00Z',
    claimedAt: '2026-09-22T10:15:00Z',
  },
  case: {
    caseId,
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
      content: 'The sign-in link returns an expired-token message.',
      occurredAt: '2026-09-21T09:20:00Z',
      recordedAt: '2026-09-21T09:20:01Z',
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
 * Installs synthetic BFF responses for the browser interaction test and guide.
 * This fixture proves UI behavior only; it does not replace backend security
 * or persistence tests and must remain labelled in generated media.
 */
export async function installSimulatedFollowUpBff(page: Page): Promise<{
  submittedCsrfToken: () => string | undefined;
  releaseRequests: () => number;
  privateEvidenceAtRelease: () => boolean | undefined;
}> {
  let claimed = false;
  let ownershipRevision = 0;
  let submittedCsrfToken: string | undefined;
  let releaseRequests = 0;
  let privateEvidenceAtRelease: boolean | undefined;

  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillSimulatedBff(route, {
      items: claimed ? [] : [{ ...workItem, ownershipRevision }],
      nextCursor: null,
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items: claimed
        ? [{ workItem: { ...workItem, ownershipRevision }, claim }]
        : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    (route) => fulfillSimulatedBff(route, caseSummary),
  );
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'browser-session-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/claim-commands',
    async (route) => {
      submittedCsrfToken = route.request().headers()['x-csrf-token'];
      const command = route.request().postDataJSON() as {
        commandId: string;
        expectedOwnershipRevision: number;
      };
      expect(command.commandId).toMatch(/^[0-9a-f-]{36}$/);
      expect(command.expectedOwnershipRevision).toBe(0);
      claimed = true;
      ownershipRevision = 1;
      await fulfillSimulatedBff(
        route,
        { commandId: command.commandId, ownershipRevision, claim },
        201,
      );
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/claims/*/release',
    async (route) => {
      releaseRequests += 1;
      privateEvidenceAtRelease =
        (await page
          .getByText('The sign-in link returns an expired-token message.')
          .count()) > 0;
      expect(route.request().headers()['x-csrf-token']).toBe(
        'browser-session-token',
      );
      expect(route.request().postDataJSON()).toEqual({
        expectedOwnershipRevision: 1,
      });
      claimed = false;
      ownershipRevision = 2;
      await fulfillSimulatedBff(
        route,
        {
          claimId,
          workItemId,
          ownershipRevision,
          releasedAt: '2026-09-22T11:00:00Z',
          recordedAt: '2026-09-22T11:00:01Z',
        },
        201,
      );
    },
  );
  return {
    submittedCsrfToken: () => submittedCsrfToken,
    releaseRequests: () => releaseRequests,
    privateEvidenceAtRelease: () => privateEvidenceAtRelease,
  };
}
