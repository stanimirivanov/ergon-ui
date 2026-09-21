import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('presents the workbench foundation', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Ergon Workbench');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Evidence in\.\s*Verified outcomes out\./i,
    }),
  ).toBeVisible();
  await expect(page.getByText('Session gate ready')).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('offers a recovery path for an unknown route', async ({ page }) => {
  await page.goto('/missing');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'This workbench view does not exist.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Return to the workbench' }),
  ).toHaveAttribute('href', '/');
});

test('offers the local BFF sign-in path without revealing tenant work', async ({
  page,
}) => {
  await page.route('**/bff/v1/tenants/*/session', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: 'urn:ergon:problem:browser-authentication-required',
        title: 'Browser authentication required',
        status: 401,
        detail: 'An authenticated browser session is required',
        signInPath: '/bff/login',
      }),
    });
  });
  await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Authentication is required.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/no resolver data has been loaded/i),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Sign in to Ergon' }),
  ).toHaveAttribute(
    'href',
    '/bff/login?returnTo=%2Ftenants%2F9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  );

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('reveals the tenant actor after the BFF session is verified', async ({
  page,
}) => {
  await page.route('**/bff/v1/tenants/*/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56Z',
        recordedAt: '2026-09-20T12:34:57Z',
      }),
    });
  });

  await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Session verified.' }),
  ).toBeVisible();
  await expect(page.getByText('workforce-sso')).toBeVisible();
  await expect(page.getByText('employee-42')).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
