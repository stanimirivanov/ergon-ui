import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { runGuideScenario } from './guide/user-guide-session';
import { sessionGuide } from './guide/session-guide';
import { installSimulatedSessionBff } from './guide/simulated-session-bff';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';

test(
  'distinguishes workbench access states without exposing resolver work',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      sessionGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedSessionBff(page);

        await page.goto('/');
        await expect(page.getByText('Session gate ready')).toBeVisible();
        await guide.result(
          'start-at-workbench',
          page.getByText('Session gate ready'),
        );

        await page.goto(tenantPath);
        const signInHeading = page.getByRole('heading', {
          level: 1,
          name: 'Authentication is required.',
        });
        await expect(signInHeading).toBeVisible();
        await expect(
          page.getByText(/no resolver data has been loaded/i),
        ).toBeVisible();
        await guide.result('recognize-sign-in-required', signInHeading);

        const signInLink = page.getByRole('link', { name: 'Sign in to Ergon' });
        await expect(signInLink).toHaveAttribute(
          'href',
          '/bff/login?returnTo=%2Ftenants%2F9ad66e9b-e81a-4b61-8d8f-5708312772d8',
        );
        await guide.result('inspect-local-sign-in-link', signInLink);

        bff.show('actor-not-registered');
        await page.reload();
        const unregisteredHeading = page.getByRole('heading', {
          level: 1,
          name: 'Your Ergon actor is not registered.',
        });
        await expect(unregisteredHeading).toBeVisible();
        await guide.result(
          'recognize-missing-actor-binding',
          unregisteredHeading,
        );

        bff.show('authentication-unavailable');
        await page.reload();
        const disabledHeading = page.getByRole('heading', {
          level: 1,
          name: 'Browser sign-in is not configured.',
        });
        await expect(disabledHeading).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Try again' }),
        ).toHaveCount(0);
        await guide.result('recognize-disabled-sign-in', disabledHeading);

        bff.show('identity-rejected');
        await page.reload();
        const rejectedHeading = page.getByRole('heading', {
          level: 1,
          name: 'This identity cannot enter the workspace.',
        });
        await expect(rejectedHeading).toBeVisible();
        await expect(
          page.getByText(/no resolver data has been loaded/i),
        ).toBeVisible();
        await guide.result('recognize-rejected-identity', rejectedHeading);
        const rejectedAccessibility = await new AxeBuilder({ page }).analyze();
        expect(rejectedAccessibility.violations).toEqual([]);

        bff.show('temporary-failure');
        await page.reload();
        const transientHeading = page.getByRole('heading', {
          level: 1,
          name: 'Session verification is temporarily unavailable.',
        });
        await expect(transientHeading).toBeVisible();
        await guide.result('recognize-temporary-failure', transientHeading);
        expect(bff.workReadCount()).toBe(0);

        const retryButton = page.getByRole('button', { name: 'Try again' });
        bff.show('verified');
        await guide.action('retry-verification', retryButton, () =>
          retryButton.click(),
        );
        const inboxHeading = page.getByRole('heading', {
          level: 1,
          name: 'Human follow-up inbox',
        });
        await expect(inboxHeading).toBeVisible();
        await expect(page.getByText('workforce-sso')).toBeVisible();
        await expect(page.getByText('employee-42')).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            level: 3,
            name: 'No active claimed work in this view.',
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', {
            level: 3,
            name: 'No open work in this view.',
          }),
        ).toBeVisible();
        expect(bff.workReadCount()).toBeGreaterThan(0);
        await guide.result('confirm-verified-workspace', inboxHeading);

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);
