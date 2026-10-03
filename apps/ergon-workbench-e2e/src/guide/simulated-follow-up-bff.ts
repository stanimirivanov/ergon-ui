import { expect, type Page, type Route } from '@playwright/test';

import { SIMULATED_BFF_HEADER } from './simulated-guide-network-boundary';

const workItemId = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';
const runId = '33333333-3333-4333-8333-333333333333';
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
} as const;

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
    body: JSON.stringify(body),
  });
}

/**
 * Installs synthetic BFF responses for the browser interaction test and guide.
 * This fixture proves UI behavior only; it does not replace backend security
 * or persistence tests and must remain labelled in generated media.
 */
export async function installSimulatedFollowUpBff(
  page: Page,
): Promise<{ submittedCsrfToken: () => string | undefined }> {
  let claimed = false;
  let ownershipRevision = 0;
  let submittedCsrfToken: string | undefined;

  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillJson(route, {
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillJson(route, {
      items: claimed ? [] : [{ ...workItem, ownershipRevision }],
      nextCursor: null,
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillJson(route, {
      items: claimed
        ? [{ workItem: { ...workItem, ownershipRevision }, claim }]
        : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    (route) => fulfillJson(route, caseSummary),
  );
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillJson(route, {
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
      await fulfillJson(
        route,
        { commandId: command.commandId, ownershipRevision, claim },
        201,
      );
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/claims/*/release',
    async (route) => {
      expect(route.request().headers()['x-csrf-token']).toBe(
        'browser-session-token',
      );
      expect(route.request().postDataJSON()).toEqual({
        expectedOwnershipRevision: 1,
      });
      claimed = false;
      ownershipRevision = 2;
      await fulfillJson(
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
  return { submittedCsrfToken: () => submittedCsrfToken };
}
