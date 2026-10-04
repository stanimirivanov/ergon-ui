import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

const tenantId = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const firstPageSize = 25;

function syntheticId(index: number, prefix: string): string {
  return `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function openedAt(index: number): string {
  return new Date(Date.UTC(2026, 8, 21, 9, index - 1))
    .toISOString()
    .replace('.000Z', 'Z');
}

const workItems = Array.from({ length: firstPageSize + 1 }, (_, offset) => {
  const index = offset + 1;
  return {
    workItemId: syntheticId(index, '1'),
    caseId: syntheticId(index, '2'),
    runId: syntheticId(index, '3'),
    escalationEventId: syntheticId(index, '4'),
    reason:
      index === 1
        ? 'RETRY_ATTEMPT_LIMIT_REACHED'
        : index === firstPageSize + 1
          ? 'IDENTITY_REVIEW_NEEDED'
          : 'ACCOUNT_REVIEW_REQUIRED',
    queueKey: index === 1 ? 'access-restoration' : 'account-review',
    status: 'OPEN',
    openedAt: openedAt(index),
    recordedAt: openedAt(index),
    ownershipRevision: 0,
  } as const;
});

const nextCursor = {
  afterOpenedAt: openedAt(firstPageSize),
  afterWorkItemId: syntheticId(firstPageSize, '1'),
};

/**
 * Serves an oldest-first synthetic inbox with a real 25-row page boundary.
 * The exact paired cursor and filter are asserted at the route so the guide
 * cannot record a plausible-looking page from a malformed browser request.
 */
export async function installSimulatedInboxBff(page: Page): Promise<{
  inboxRequests: () => readonly string[];
}> {
  const inboxRequests: string[] = [];

  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) => {
    const url = new URL(route.request().url());
    const params = url.searchParams;
    inboxRequests.push(url.search);
    expect(url.pathname).toBe(`/bff/v1/tenants/${tenantId}/human-follow-ups`);
    expect(params.get('limit')).toBe(String(firstPageSize));
    expect([...params.keys()].sort()).toEqual(
      (params.has('queueKey')
        ? ['limit', 'queueKey']
        : params.has('afterOpenedAt') || params.has('afterWorkItemId')
          ? ['afterOpenedAt', 'afterWorkItemId', 'limit']
          : ['limit']
      ).sort(),
    );

    if (params.has('queueKey')) {
      const items =
        params.get('queueKey') === 'access-restoration' ? [workItems[0]] : [];
      return fulfillSimulatedBff(route, { items, nextCursor: null });
    }
    if (params.has('afterOpenedAt')) {
      expect(params.get('afterOpenedAt')).toBe(nextCursor.afterOpenedAt);
      expect(params.get('afterWorkItemId')).toBe(nextCursor.afterWorkItemId);
      return fulfillSimulatedBff(route, {
        items: [workItems[firstPageSize]],
        nextCursor: null,
      });
    }
    return fulfillSimulatedBff(route, {
      items: workItems.slice(0, firstPageSize),
      nextCursor,
    });
  });

  return { inboxRequests: () => inboxRequests };
}
