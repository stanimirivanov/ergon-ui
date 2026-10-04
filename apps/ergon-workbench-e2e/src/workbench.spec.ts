import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { followUpGuide } from './guide/follow-up-guide';
import { installSimulatedFollowUpBff } from './guide/simulated-follow-up-bff';
import {
  installSimulatedGuideNetworkBoundary,
  SIMULATED_BFF_HEADER,
} from './guide/simulated-guide-network-boundary';
import { runGuideScenario } from './guide/user-guide-session';

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

test('simulated guide traffic stays inside its fixture boundary', async ({
  browser,
  baseURL,
}) => {
  const previewURL = baseURL ?? 'http://localhost:4300';
  const context = await browser.newContext({
    baseURL: previewURL,
    serviceWorkers: 'block',
  });
  try {
    const boundary = await installSimulatedGuideNetworkBoundary(
      context,
      new URL(previewURL).origin,
    );
    const page = await context.newPage();
    await page.route('**/bff/fixture', (route) =>
      route.fulfill({
        status: 200,
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        body: 'simulated',
      }),
    );
    await page.route('**/bff/unmarked', (route) =>
      route.fulfill({ status: 200, body: 'unmarked' }),
    );
    await page.goto('/');
    await expect(page.getByText('Session gate ready')).toBeVisible();
    expect(
      await page.evaluate(async () => (await fetch('/bff/fixture')).text()),
    ).toBe('simulated');
    await expect(
      boundary.assertNoUnexpectedRequests(),
    ).resolves.toBeUndefined();

    const failures = await page.evaluate(async () =>
      Promise.all(
        [
          '/bff/unmocked',
          '/internal/v1/unexpected',
          'https://example.invalid/unexpected',
        ].map((url) =>
          fetch(url).then(
            () => false,
            () => true,
          ),
        ),
      ),
    );
    expect(failures).toEqual([true, true, true]);
    expect(
      await page.evaluate(async () => (await fetch('/bff/unmarked')).text()),
    ).toBe('unmarked');
    await expect(boundary.assertNoUnexpectedRequests()).rejects.toThrow(
      /GET \/bff\/unmarked, GET \/bff\/unmocked, GET \/internal\/v1\/unexpected, GET https:\/\/example\.invalid\/unexpected/u,
    );
  } finally {
    await context.close();
  }
});

test(
  'reveals visible follow-up work after the BFF session is verified',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpBff(page);
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');

        await expect(
          page.getByRole('heading', {
            level: 1,
            name: 'Human follow-up inbox',
          }),
        ).toBeVisible();
        await expect(page.getByText('workforce-sso')).toBeVisible();
        await guide.result(
          'verified-session',
          page.getByRole('heading', {
            level: 1,
            name: 'Human follow-up inbox',
          }),
        );
        await expect(
          page.getByRole('heading', {
            level: 3,
            name: 'Retry attempt limit reached',
          }),
        ).toBeVisible();
        await expect(page.getByText('access-restoration')).toBeVisible();
        await expect(page.getByText('employee-42')).toHaveCount(0);
        await guide.result(
          'shared-work',
          page
            .getByRole('region', { name: 'Open follow-up work' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        );

        const claimButton = page.getByRole('button', {
          name: 'Claim Retry attempt limit reached follow-up',
        });
        await guide.action('claim-work', claimButton, () =>
          claimButton.click(),
        );
        await expect(page.getByText('Follow-up claimed.')).toBeVisible();
        await expect(page.getByText('Claimed', { exact: true })).toBeVisible();
        await expect(
          page
            .getByRole('region', { name: 'Open follow-up work' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        ).toHaveCount(0);
        await expect(
          page
            .getByRole('region', { name: 'Claimed follow-ups' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        ).toBeVisible();
        expect(bff.submittedCsrfToken()).toBe('browser-session-token');
        await guide.result(
          'owned-work',
          page
            .getByRole('region', { name: 'Claimed follow-ups' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        );

        const contextButton = page.getByRole('button', {
          name: 'Review case context',
        });
        await guide.action('review-context', contextButton, () =>
          contextButton.click(),
        );
        await expect(
          page.getByRole('heading', {
            level: 4,
            name: 'Restore access to the customer workspace',
          }),
        ).toBeVisible();
        await expect(
          page.getByText('The sign-in link returns an expired-token message.'),
        ).toBeVisible();
        await expect(page.getByText('HIGH risk')).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 5, name: 'Automation handoff' }),
        ).toBeVisible();
        await expect(
          page.getByText('identity-stub', { exact: true }),
        ).toBeVisible();
        await expect(page.getByText('2 of 2', { exact: true })).toBeVisible();
        await guide.result(
          'handoff-evidence',
          page.getByRole('heading', { level: 5, name: 'Automation handoff' }),
        );

        const releaseButton = page.getByRole('button', {
          name: 'Release Retry attempt limit reached follow-up',
        });
        await guide.action('request-release', releaseButton, () =>
          releaseButton.click(),
        );
        await expect(
          page.getByText(
            'Releasing returns this work to its original shared queue. It does not complete the case.',
          ),
        ).toBeVisible();
        const confirmButton = page.getByRole('button', {
          name: 'Confirm release',
        });
        await guide.action('confirm-release', confirmButton, () =>
          confirmButton.click(),
        );
        await expect(
          page.getByRole('status', { name: 'Follow-up released' }),
        ).toBeVisible();
        await expect(
          page.getByText('The sign-in link returns an expired-token message.'),
        ).toHaveCount(0);
        await expect(
          page
            .getByRole('region', { name: 'Claimed follow-ups' })
            .getByRole('heading', {
              level: 3,
              name: 'No active claimed work in this view.',
            }),
        ).toBeVisible();
        await expect(
          page
            .getByRole('region', { name: 'Open follow-up work' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        ).toBeVisible();
        await guide.result(
          'returned-work',
          page
            .getByRole('region', { name: 'Open follow-up work' })
            .getByRole('heading', {
              level: 3,
              name: 'Retry attempt limit reached',
            }),
        );

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);
