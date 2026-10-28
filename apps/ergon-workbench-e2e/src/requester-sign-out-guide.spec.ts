import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { requesterSignOutGuide } from './guide/requester-sign-out-guide';
import {
  installSimulatedRequesterSignOutBff,
  signOutTenant,
} from './guide/simulated-requester-sign-out-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'retires requester drafts before logout and explicitly recovers an uncertain response',
  { tag: '@user-guide' },
  async ({ browser }) =>
    runGuideScenario(
      browser,
      'http://localhost:4301',
      requesterSignOutGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRequesterSignOutBff(page);
        await page.goto('/tenants/' + signOutTenant);
        await page.getByRole('link', { name: 'Start a request' }).click();
        const goal = page.getByRole('textbox', { name: 'Desired outcome' });
        await goal.fill('SYNTHETIC-PRIVATE-DRAFT');
        await page
          .getByRole('textbox', { name: 'What happened?' })
          .fill('Synthetic private observation, not submitted.');
        await guide.result('exit-draft', goal);
        const signOut = page.getByRole('button', {
          name: 'Sign out',
          exact: true,
        });
        await signOut.click();
        await expect(
          page.getByRole('dialog', { name: 'Sign out of this application?' }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(signOut).toBeFocused();
        await expect(goal).toHaveValue('SYNTHETIC-PRIVATE-DRAFT');
        expect(bff.csrfReads()).toBe(0);
        expect(bff.posts()).toBe(0);
        await guide.result('exit-cancel', signOut);
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
        await guide.result('exit-narrow', dialog.getByRole('heading'));
        const confirm = page.getByRole('button', { name: 'Sign out locally' });
        await confirm.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByRole('textbox')).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(bff.posts()).toBe(1);
        await expect(
          page.getByRole('link', { name: 'Sign in again' }),
        ).toHaveCount(0);
        await guide.result('exit-uncertain', page.getByRole('alert'));
        await page.setViewportSize({ width: 1440, height: 900 });
        const retry = page.getByRole('button', {
          name: 'Retry local sign-out',
        });
        await guide.action('exit-retry', retry, async () => {
          await retry.click();
          await expect(
            page.getByRole('heading', { name: 'You are signed out locally.' }),
          ).toBeFocused();
        });
        expect(bff.csrfReads()).toBe(2);
        expect(bff.posts()).toBe(2);
        const sessions = bff.sessions();
        await page.goBack();
        await expect(page).toHaveURL(
          'http://localhost:4301/tenants/' + signOutTenant,
        );
        await expect(
          page.getByRole('heading', { name: 'You are signed out locally.' }),
        ).toBeVisible();
        await expect(page.getByRole('textbox')).toHaveCount(0);
        expect(bff.sessions()).toBe(sessions);
        await guide.result(
          'exit-back',
          page.getByRole('heading', { name: 'You are signed out locally.' }),
        );
        const login = page.getByRole('link', { name: 'Sign in again' });
        await expect(login).toHaveAttribute(
          'href',
          '/bff/login?returnTo=%2Ftenants%2F' + signOutTenant,
        );
        expect(
          await page.evaluate(
            () => localStorage.length + sessionStorage.length,
          ),
        ).toBe(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('exit-sign-in', login);
      },
    ),
);

test('an expired requester session retires the view without sending a logout POST', async ({
  page,
}) => {
  const bff = await installSimulatedRequesterSignOutBff(page);
  await page.goto('http://localhost:4301/tenants/' + signOutTenant + '/new');
  await expect(page.getByRole('form', { name: 'New request' })).toBeVisible();
  bff.expire();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out locally' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign-in is required.' }),
  ).toBeFocused();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  expect(bff.csrfReads()).toBe(1);
  expect(bff.posts()).toBe(0);
});
