import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import { installSimulatedRunControlBff } from './simulated-run-control-bff';

/** Reuse the producer's real control fixture; logout never implicitly changes its lease or command history. */
export async function installSimulatedWorkbenchSignOutBff(page: Page): Promise<
  Awaited<ReturnType<typeof installSimulatedRunControlBff>> & {
    beginExit(): void;
    expireSession(): void;
    logoutPosts(): number;
    logoutCsrfReads(): number;
  }
> {
  const base = await installSimulatedRunControlBff(page);
  let exiting = false,
    expired = false,
    posts = 0,
    csrf = 0;
  await page.route('**/bff/v1/csrf', async (route) => {
    if (!exiting) return route.fallback();
    csrf++;
    expect(route.request().method()).toBe('GET');
    expect(await page.locator('[data-workbench-mode]').count()).toBe(0);
    expect(await page.getByRole('dialog').count()).toBe(0);
    expect(await page.getByRole('textbox').count()).toBe(0);
    await expect(
      page.getByRole('heading', { name: 'Signing out locally…' }),
    ).toBeFocused();
    return expired
      ? fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath: '/bff/login',
          },
          401,
        )
      : fulfillSimulatedBff(route, {
          headerName: 'X-CSRF-TOKEN',
          token: 'logout-' + csrf,
        });
  });
  await page.route('**/bff/logout', async (route) => {
    expect(exiting).toBe(true);
    expect(route.request().method()).toBe('POST');
    expect(route.request().postData()).toBeNull();
    expect(route.request().headers()['x-csrf-token']).toBe('logout-' + csrf);
    posts++;
    if (posts === 1) return route.abort('failed');
    await route.fulfill({
      status: 204,
      headers: {
        'x-ergon-guide-fixture': 'simulated-bff',
        'Cache-Control': 'no-store',
      },
    });
  });
  return {
    ...base,
    beginExit(): void {
      exiting = true;
    },
    expireSession(): void {
      exiting = true;
      expired = true;
    },
    logoutPosts: () => posts,
    logoutCsrfReads: () => csrf,
  };
}
