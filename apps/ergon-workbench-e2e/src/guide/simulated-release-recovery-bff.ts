import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

const workItemId = '11111111-1111-4111-8111-111111111111';
const claimId = '77777777-7777-4777-8777-777777777777';
const workItem = {
  workItemId,
  caseId: '22222222-2222-4222-8222-222222222222',
  runId: '33333333-3333-4333-8333-333333333333',
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

interface ReleaseRequest {
  readonly workItemId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
  readonly csrfHeader: string | undefined;
}

/**
 * Compares disabled and enabled rollout states, then simulates a lost release
 * response after recording the mutation. Only exact replay gets its receipt.
 */
export async function installSimulatedReleaseRecoveryBff(page: Page): Promise<{
  enableRelease: () => void;
  requests: () => readonly ReleaseRequest[];
}> {
  let releaseEnabled = false;
  let released = false;
  const requests: ReleaseRequest[] = [];

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
      items: released ? [{ ...workItem, ownershipRevision: 2 }] : [],
      nextCursor: null,
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items: released
        ? []
        : [{ workItem: { ...workItem, ownershipRevision: 1 }, claim }],
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
    '**/bff/v1/tenants/*/human-follow-ups/*/claims/*/release',
    async (route) => {
      const parts = new URL(route.request().url()).pathname.split('/');
      const request: ReleaseRequest = {
        workItemId: parts.at(-4) ?? '',
        claimId: parts.at(-2) ?? '',
        expectedOwnershipRevision: (
          route.request().postDataJSON() as {
            expectedOwnershipRevision: number;
          }
        ).expectedOwnershipRevision,
        csrfHeader: route.request().headers()['x-csrf-token'],
      };
      expect(request).toEqual({
        workItemId,
        claimId,
        expectedOwnershipRevision: 1,
        csrfHeader: 'browser-session-token',
      });
      requests.push(request);

      if (!releaseEnabled) {
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:human-follow-up-release-unavailable',
            title: 'Human follow-up release unavailable',
            status: 503,
          },
          503,
        );
        return;
      }

      if (!released) {
        // Persist the release before losing its response: only an exact replay
        // can safely recover the outcome without issuing a new intent.
        released = true;
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

      expect(request).toEqual(requests[1]);
      await fulfillSimulatedBff(route, {
        claimId,
        workItemId,
        ownershipRevision: 2,
        releasedAt: '2026-09-22T11:00:00Z',
        recordedAt: '2026-09-22T11:00:01Z',
      });
    },
  );

  return {
    enableRelease: () => {
      releaseEnabled = true;
    },
    requests: () => requests,
  };
}
