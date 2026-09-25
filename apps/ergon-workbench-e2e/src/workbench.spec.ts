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

test('reveals visible follow-up work after the BFF session is verified', async ({
  page,
}) => {
  let claimed = false;
  let submittedCsrfToken: string | undefined;
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
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: claimed
          ? []
          : [
              {
                workItemId: '11111111-1111-4111-8111-111111111111',
                caseId: '22222222-2222-4222-8222-222222222222',
                runId: '33333333-3333-4333-8333-333333333333',
                escalationEventId: '44444444-4444-4444-8444-444444444444',
                reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
                queueKey: 'access-restoration',
                status: 'OPEN',
                openedAt: '2026-09-21T09:30:00Z',
                recordedAt: '2026-09-21T09:30:01Z',
              },
            ],
        nextCursor: null,
      }),
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/owned?*',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: claimed
            ? [
                {
                  workItem: {
                    workItemId: '11111111-1111-4111-8111-111111111111',
                    caseId: '22222222-2222-4222-8222-222222222222',
                    runId: '33333333-3333-4333-8333-333333333333',
                    escalationEventId: '44444444-4444-4444-8444-444444444444',
                    reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
                    queueKey: 'access-restoration',
                    status: 'OPEN',
                    openedAt: '2026-09-21T09:30:00Z',
                    recordedAt: '2026-09-21T09:30:01Z',
                  },
                  claim: {
                    claimId: '77777777-7777-4777-8777-777777777777',
                    workItemId: '11111111-1111-4111-8111-111111111111',
                    claimedAt: '2026-09-22T10:15:00Z',
                    recordedAt: '2026-09-22T10:15:01Z',
                  },
                },
              ]
            : [],
          nextCursor: null,
        }),
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          followUp: {
            workItemId: '11111111-1111-4111-8111-111111111111',
            queueKey: 'access-restoration',
            escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
            openedAt: '2026-09-21T09:30:00Z',
            claimedAt: '2026-09-22T10:15:00Z',
          },
          case: {
            caseId: '22222222-2222-4222-8222-222222222222',
            goal: 'Restore access to the customer workspace',
            status: 'OPEN',
            streamVersion: 4,
            resolutionContract: {
              key: 'access-restoration',
              revision: 2,
            },
          },
          observations: [
            {
              streamVersion: 1,
              eventType: 'SourceObservationRecorded',
              summary: 'Customer cannot sign in',
              observationId: '88888888-8888-4888-8888-888888888888',
              originType: 'EMAIL',
              provider: 'support-mailbox',
              reference: 'message-42',
              content: 'The sign-in link returns an expired-token message.',
              occurredAt: '2026-09-21T09:20:00Z',
              recordedAt: '2026-09-21T09:20:01Z',
            },
          ],
          resolutionRun: {
            runId: '33333333-3333-4333-8333-333333333333',
            caseEvidenceStreamVersion: 4,
            contractKey: 'access-restoration',
            contractRevision: 2,
            policyRevision: 'policy-7',
            stepId: 'verify-account-owner',
            capability: 'identity.lookup',
            effectiveRisk: 'HIGH',
            requiredApproval: 'RESOLVER',
            attemptNumber: 2,
            predecessorRunId: null,
            state: 'ESCALATED',
            stateVersion: 3,
            stateUpdatedAt: '2026-09-21T09:30:00Z',
            recordedAt: '2026-09-21T09:30:01Z',
          },
        }),
      });
    },
  );
  await page.route('**/bff/v1/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headerName: 'X-CSRF-TOKEN',
        token: 'browser-session-token',
      }),
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/claims',
    async (route) => {
      submittedCsrfToken = route.request().headers()['x-csrf-token'];
      claimed = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          claimId: '77777777-7777-4777-8777-777777777777',
          workItemId: '11111111-1111-4111-8111-111111111111',
          claimedAt: '2026-09-22T10:15:00Z',
          recordedAt: '2026-09-22T10:15:01Z',
        }),
      });
    },
  );

  await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Human follow-up inbox' }),
  ).toBeVisible();
  await expect(page.getByText('workforce-sso')).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 3,
      name: 'Retry attempt limit reached',
    }),
  ).toBeVisible();
  await expect(page.getByText('access-restoration')).toBeVisible();
  await expect(page.getByText('employee-42')).toHaveCount(0);

  await page
    .getByRole('button', {
      name: 'Claim Retry attempt limit reached follow-up',
    })
    .click();

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
  expect(submittedCsrfToken).toBe('browser-session-token');

  await page.getByRole('button', { name: 'Review case context' }).click();
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

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
