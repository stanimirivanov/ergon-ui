import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const signOutTenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
/** Exact synthetic session/exit routes; unknown business writes and provider traffic have no fallback. */
export async function installSimulatedRequesterSignOutBff(page: Page): Promise<{
  sessions(): number;
  csrfReads(): number;
  posts(): number;
  expire(): void;
}> {
  let sessions = 0,
    csrfReads = 0,
    posts = 0,
    ended = false;
  const root = '/bff/v1/tenants/' + signOutTenant;
  const absent = {
    type: 'urn:ergon:problem:browser-authentication-required',
    signInPath: '/bff/login',
  };
  await page.route('**/bff/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    expect(new URL(request.url()).search).toBe('');
    if (path === root + '/session' && request.method() === 'GET') {
      sessions++;
      if (ended) await fulfillSimulatedBff(route, absent, 401);
      else
        await fulfillSimulatedBff(route, {
          actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          identityProvider: 'requester-sso',
          registeredAt: '2026-10-28T09:00:00Z',
          recordedAt: '2026-10-28T09:00:00Z',
        });
    } else if (path === '/bff/v1/csrf' && request.method() === 'GET') {
      csrfReads++;
      // Record the actual I/O boundary, without holding a request across narration.
      expect(await page.getByRole('textbox').count()).toBe(0);
      expect(await page.getByRole('dialog').count()).toBe(0);
      expect(
        await page
          .getByRole('heading', { name: 'Signing out locally…' })
          .evaluate((element) => element === document.activeElement),
      ).toBe(true);
      if (ended) await fulfillSimulatedBff(route, absent, 401);
      else
        await fulfillSimulatedBff(route, {
          headerName: 'X-CSRF-TOKEN',
          token: 'sign-out-' + csrfReads,
        });
    } else if (path === '/bff/logout' && request.method() === 'POST') {
      posts++;
      expect(request.headers()['x-csrf-token']).toBe('sign-out-' + csrfReads);
      expect(request.postData()).toBeNull();
      if (posts === 1) await route.abort('failed');
      else {
        ended = true;
        await route.fulfill({
          status: 204,
          headers: {
            'x-ergon-guide-fixture': 'simulated-bff',
            'Cache-Control': 'no-store',
          },
        });
      }
    } else
      throw new Error(
        'Unexpected synthetic sign-out request: ' +
          request.method() +
          ' ' +
          path,
      );
  });
  return {
    sessions: () => sessions,
    csrfReads: () => csrfReads,
    posts: () => posts,
    expire(): void {
      ended = true;
    },
  };
}
