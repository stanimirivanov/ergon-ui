import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

const competingWorkItemId = '11111111-1111-4111-8111-111111111111';
const recoverableWorkItemId = '55555555-5555-4555-8555-555555555555';
const claimId = '77777777-7777-4777-8777-777777777777';

const competingWorkItem = {
  workItemId: competingWorkItemId,
  caseId: '22222222-2222-4222-8222-222222222222',
  runId: '33333333-3333-4333-8333-333333333333',
  escalationEventId: '44444444-4444-4444-8444-444444444444',
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
  queueKey: 'access-restoration',
  status: 'OPEN',
  openedAt: '2026-09-21T09:30:00Z',
  recordedAt: '2026-09-21T09:30:01Z',
  ownershipRevision: 0,
} as const;

const recoverableWorkItem = {
  workItemId: recoverableWorkItemId,
  caseId: '66666666-6666-4666-8666-666666666666',
  runId: '88888888-8888-4888-8888-888888888888',
  escalationEventId: '99999999-9999-4999-8999-999999999999',
  reason: 'MANUAL_REVIEW_REQUIRED',
  queueKey: 'account-review',
  status: 'OPEN',
  openedAt: '2026-09-21T10:30:00Z',
  recordedAt: '2026-09-21T10:30:01Z',
  ownershipRevision: 0,
} as const;

interface ClaimRequest {
  readonly workItemId: string;
  readonly commandId: string;
  readonly expectedOwnershipRevision: number;
  readonly csrfHeader: string | undefined;
}

/**
 * Illustrates two different claim failures without making a live ownership
 * assertion: one competing claim and one lost response after a recorded claim.
 * The second request succeeds only when it replays the exact first command.
 */
export async function installSimulatedClaimRecoveryBff(page: Page): Promise<{
  requests: () => readonly ClaimRequest[];
}> {
  let competingItemGone = false;
  let recoverableItemClaimed = false;
  const requests: ClaimRequest[] = [];

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
      items: [
        ...(competingItemGone ? [] : [competingWorkItem]),
        ...(recoverableItemClaimed ? [] : [recoverableWorkItem]),
      ],
      nextCursor: null,
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items: recoverableItemClaimed
        ? [
            {
              workItem: { ...recoverableWorkItem, ownershipRevision: 1 },
              claim: {
                claimId,
                workItemId: recoverableWorkItemId,
                claimedAt: '2026-09-22T10:15:00Z',
                recordedAt: '2026-09-22T10:15:01Z',
              },
            },
          ]
        : [],
      nextCursor: null,
    }),
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
      const workItemId = new URL(route.request().url()).pathname
        .split('/')
        .at(-2);
      const body = route.request().postDataJSON() as {
        commandId: string;
        expectedOwnershipRevision: number;
      };
      expect(body.commandId).toMatch(/^[0-9a-f-]{36}$/u);
      expect(body.expectedOwnershipRevision).toBe(0);
      const request = {
        workItemId: workItemId ?? '',
        commandId: body.commandId,
        expectedOwnershipRevision: body.expectedOwnershipRevision,
        csrfHeader: route.request().headers()['x-csrf-token'],
      };
      requests.push(request);
      expect(request.csrfHeader).toBe('browser-session-token');

      if (workItemId === competingWorkItemId) {
        competingItemGone = true;
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:human-follow-up-already-claimed',
            title: 'Follow-up already claimed',
            status: 409,
          },
          409,
        );
        return;
      }

      if (workItemId !== recoverableWorkItemId) {
        throw new Error('Unexpected synthetic claim target.');
      }
      const firstRequest = requests.find(
        (candidate) => candidate.workItemId === recoverableWorkItemId,
      );
      expect(request).toEqual(firstRequest);
      if (!recoverableItemClaimed) {
        // The synthetic server records the claim but the browser receives an
        // uncertain response. Replay must return the same durable receipt.
        recoverableItemClaimed = true;
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:temporary-failure',
            title: 'Response unavailable',
            status: 503,
          },
          503,
        );
        return;
      }
      await fulfillSimulatedBff(
        route,
        {
          commandId: body.commandId,
          ownershipRevision: 1,
          claim: {
            claimId,
            workItemId: recoverableWorkItemId,
            claimedAt: '2026-09-22T10:15:00Z',
            recordedAt: '2026-09-22T10:15:01Z',
          },
        },
        200,
      );
    },
  );

  return { requests: () => requests };
}
