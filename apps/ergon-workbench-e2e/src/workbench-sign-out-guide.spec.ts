import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { workbenchSignOutGuide } from './guide/workbench-sign-out-guide';
import { installSimulatedWorkbenchSignOutBff } from './guide/simulated-workbench-sign-out-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'retires workbench resources without implicitly releasing control and recovers uncertain logout explicitly',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      workbenchSignOutGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedWorkbenchSignOutBff(page);
        const businessWrites: string[] = [];
        let privateReads = 0;
        page.on('request', (request) => {
          const path = new URL(request.url()).pathname;
          if (path.startsWith('/bff/v1/tenants/')) {
            if (request.method() === 'GET') privateReads++;
            else businessWrites.push(path);
          }
        });
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const panel = page.getByRole('region', {
          name: 'Browser control',
          exact: true,
        });
        await panel
          .getByRole('button', { name: 'Acquire browser control' })
          .click();
        await expect(panel).toContainText('This browser session holds control');
        expect(bff.controlIntents()).toHaveLength(1);
        await guide.result('workbench-exit-context', panel);
        bff.beginExit();
        const signOut = page.getByRole('button', {
          name: 'Sign out',
          exact: true,
        });
        await signOut.click();
        await page.keyboard.press('Escape');
        await expect(signOut).toBeFocused();
        await expect(panel).toBeVisible();
        expect(bff.logoutCsrfReads()).toBe(0);
        expect(bff.logoutPosts()).toBe(0);
        await guide.result('workbench-exit-cancel', signOut);
        await page.setViewportSize({ width: 320, height: 812 });
        await signOut.click();
        const dialog = page.getByRole('dialog', {
          name: 'Sign out of this application?',
        });
        await expect(dialog).toBeVisible();
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result(
          'workbench-exit-narrow',
          dialog.getByRole('heading'),
        );
        await dialog.getByRole('button', { name: 'Sign out locally' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(panel).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(
          page.getByRole('link', { name: 'Sign in again' }),
        ).toHaveCount(0);
        expect(bff.logoutPosts()).toBe(1);
        expect(businessWrites).toHaveLength(1);
        await guide.result('workbench-exit-uncertain', page.getByRole('alert'));
        await page.setViewportSize({ width: 1440, height: 900 });
        await guide.action(
          'workbench-exit-retry',
          page.getByRole('button', { name: 'Retry local sign-out' }),
          async () => {
            await page
              .getByRole('button', { name: 'Retry local sign-out' })
              .click();
            await expect(
              page.getByRole('heading', {
                name: 'You are signed out locally.',
              }),
            ).toBeFocused();
          },
        );
        expect(bff.logoutPosts()).toBe(2);
        expect(bff.logoutCsrfReads()).toBe(2);
        expect(bff.controlIntents()).toHaveLength(1);
        expect(businessWrites).toHaveLength(1);
        const reads = privateReads;
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(supervisorTenantPath + '$'));
        await expect(
          page.getByRole('heading', { name: 'You are signed out locally.' }),
        ).toBeVisible();
        await expect(panel).toHaveCount(0);
        expect(privateReads).toBe(reads);
        await guide.result(
          'workbench-exit-back',
          page.getByRole('heading', { name: 'You are signed out locally.' }),
        );
        const login = page.getByRole('link', { name: 'Sign in again' });
        await expect(login).toHaveAttribute(
          'href',
          '/bff/login?returnTo=%2Ftenants%2F' +
            supervisorTenantPath.split('/')[2],
        );
        expect(
          await page.evaluate(
            () => localStorage.length + sessionStorage.length,
          ),
        ).toBe(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('workbench-exit-sign-in', login);
      },
    ),
);

test('expired workbench authentication retires the view without a logout POST', async ({
  page,
}) => {
  const bff = await installSimulatedWorkbenchSignOutBff(page);
  await page.goto(supervisorTenantPath);
  await expect(
    page.getByRole('link', { name: 'Assigned runs', exact: true }),
  ).toBeVisible();
  bff.expireSession();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out locally' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign-in is required.' }),
  ).toBeFocused();
  expect(bff.logoutPosts()).toBe(0);
  expect(bff.logoutCsrfReads()).toBe(1);
  expect(bff.controlIntents()).toHaveLength(0);
});
