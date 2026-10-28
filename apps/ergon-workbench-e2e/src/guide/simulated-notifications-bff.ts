import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const notificationTenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
export const notificationTarget = '22222222-2222-4222-8222-222222222222';
type Mode =
  'populated' | 'empty' | 'forbidden' | 'unavailable' | 'malformed' | 'sign-in';

/** Exact synthetic GET routes only. Historical deliveries never authorize the deliberately denied target. */
export async function installSimulatedNotificationsBff(
  page: Page,
  audience: 'requester' | 'resolver',
): Promise<{
  mode(value: Mode): void;
  sessions(): number;
  targets(): number;
}> {
  let mode: Mode = 'populated',
    sessions = 0,
    targets = 0;
  const root = '/bff/v1/tenants/' + notificationTenant;
  await page.route('**/bff/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    expect(request.method()).toBe('GET');
    expect(new URL(request.url()).search).toBe('');
    if (path === root + '/session') {
      sessions++;
      await fulfillSimulatedBff(route, {
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: audience + '-sso',
        registeredAt: '2026-10-28T09:00:00Z',
        recordedAt: '2026-10-28T09:00:00Z',
      });
    } else if (path === root + '/notifications') {
      if (mode === 'forbidden')
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:human-notifications-forbidden' },
          403,
        );
      else if (mode === 'unavailable')
        await fulfillSimulatedBff(route, {}, 503);
      else if (mode === 'malformed')
        await fulfillSimulatedBff(route, {
          items: [{ privateText: 'PRIVATE-MALFORMED' }],
          truncated: false,
        });
      else if (mode === 'sign-in')
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath: '/bff/login',
          },
          401,
        );
      else
        await fulfillSimulatedBff(route, {
          items:
            mode === 'empty'
              ? []
              : [
                  {
                    kind:
                      audience === 'requester'
                        ? 'INFORMATION_REQUESTED'
                        : 'FOLLOW_UP_HANDED_OVER',
                    sourceId: '33333333-3333-4333-8333-333333333333',
                    target: {
                      kind:
                        audience === 'requester'
                          ? 'REQUESTER_CASE'
                          : 'OWNED_HUMAN_FOLLOW_UP',
                      id: notificationTarget,
                    },
                    deliveredAt: '2026-10-28T09:00:00.123456789Z',
                    privateText: 'PRIVATE-UNSOLICITED',
                  },
                  ...(audience === 'resolver'
                    ? [
                        {
                          kind: 'FOLLOW_UP_HANDED_OVER',
                          sourceId: '33333333-3333-4333-8333-333333333333',
                          target: {
                            kind: 'OWNED_HUMAN_FOLLOW_UP',
                            id: '11111111-1111-4111-8111-111111111111',
                          },
                          deliveredAt: '2026-10-28T09:00:00.123456789Z',
                        },
                      ]
                    : []),
                ],
          truncated: false,
        });
    } else if (
      path ===
        root + '/human-follow-ups/' + notificationTarget + '/case-summary' &&
      audience === 'resolver'
    ) {
      targets++;
      await fulfillSimulatedBff(
        route,
        { type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found' },
        404,
      );
    } else if (
      path === root + '/requester-cases/' + notificationTarget &&
      audience === 'requester'
    ) {
      targets++;
      await fulfillSimulatedBff(
        route,
        { type: 'urn:ergon:problem:requester-case-not-found' },
        404,
      );
    } else
      throw new Error(
        'Unexpected synthetic notification request: ' +
          request.method() +
          ' ' +
          path,
      );
  });
  return {
    mode(value): void {
      mode = value;
    },
    sessions: () => sessions,
    targets: () => targets,
  };
}
