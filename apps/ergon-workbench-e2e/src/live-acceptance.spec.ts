import { expect, test, type Page } from '@playwright/test';

const requester = 'https://requester.localhost:4441';
const workbench = 'https://workbench.localhost:4440';
const tenant =
  process.env['ERGON_LIVE_TENANT'] ?? 'e2e00000-0000-4000-8000-000000000001';
const foreignTenant = 'e2e00000-0000-4000-8000-000000000002';

function session(origin: string, scope = tenant): string {
  return origin + '/bff/v1/tenants/' + scope + '/session';
}

async function signIn(page: Page, origin: string, user: string, path: string) {
  const home = '/tenants/' + tenant;
  await page.goto(origin + '/bff/login?returnTo=' + encodeURIComponent(home));
  await page.getByLabel(/username/i).fill(user);
  await page.getByLabel('Password', { exact: true }).fill('ergon-test-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(origin + home);
  expect((await page.request.get(session(origin))).status()).toBe(200);
  if (path !== home) await page.goto(origin + path);
}

test('real requester intake and logout preserve independent workbench access', async ({
  page,
  context,
  browser,
}) => {
  const path = '/tenants/' + tenant + '/new';
  await signIn(page, requester, 'requester', path);
  expect((await page.request.get(session(workbench))).status()).toBe(401);
  expect(
    (await page.request.get(session(requester, foreignTenant))).status(),
  ).toBe(403);
  const cookie = (await context.cookies(requester)).find(({ name }) =>
    name.includes('Ergon-Requester-Session'),
  );
  expect(cookie).toMatchObject({ secure: true, httpOnly: true, path: '/' });
  expect((await page.request.post(requester + '/bff/logout')).status()).toBe(
    403,
  );

  const goal = 'Restore access for live acceptance';
  await page.getByRole('textbox', { name: 'Desired outcome' }).fill(goal);
  await page
    .getByRole('textbox', { name: 'What happened?' })
    .fill('The account is locked.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create request' }).click();
  await page.getByRole('link', { name: 'Check current case progress' }).click();
  await expect(page.getByRole('heading', { name: goal })).toBeVisible();

  const progressPath = new URL(page.url()).pathname;
  const caseId = progressPath.split('/').at(-1);
  const stranger = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const strangerPage = await stranger.newPage();
    await signIn(strangerPage, requester, 'resolver', progressPath);
    const denied = await strangerPage.request.get(
      requester +
        '/bff/v1/tenants/' +
        tenant +
        '/requester-cases/' +
        caseId +
        '/progress',
    );
    expect(denied.status()).toBe(404);
    await expect(strangerPage.getByRole('heading', { name: goal })).toHaveCount(
      0,
    );
  } finally {
    await stranger.close();
  }

  // Force a second IdP identity while preserving the first app's local session.
  const workbenchPage = await context.newPage();
  await context.clearCookies({ domain: '127.0.0.1' });
  await signIn(workbenchPage, workbench, 'resolver', '/tenants/' + tenant);
  expect((await page.request.get(session(requester))).status()).toBe(200);
  expect(
    (await page.request.get(session(workbench, foreignTenant))).status(),
  ).toBe(403);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out locally' }).click();
  await expect(
    page.getByRole('heading', { name: 'You are signed out locally.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: goal })).toHaveCount(0);
  expect((await page.request.get(session(requester))).status()).toBe(401);
  expect((await workbenchPage.request.get(session(workbench))).status()).toBe(
    200,
  );
  await context.clearCookies({ domain: '127.0.0.1' });
  await signIn(page, requester, 'requester', progressPath);
  await expect(page.getByRole('heading', { name: goal })).toBeVisible();
});

test('resolver confirms promotion using a real evaluation report', async ({
  page,
}) => {
  await signIn(
    page,
    workbench,
    'resolver',
    '/tenants/' + tenant + '/simulation',
  );
  const selection = process.env['ERGON_LIVE_REPORT_SELECTION'];
  const reportId = process.env['ERGON_LIVE_REPORT_ID'];
  expect(selection, 'seeded report selection').toBeTruthy();
  await page
    .getByRole('button', { name: 'Inspect report ' + reportId, exact: true })
    .click();
  await expect(
    page.getByRole('article', { name: 'Exact evaluation report' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Review contract promotion', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Contract key', exact: true })
    .fill('restore-access');
  await page
    .getByRole('textbox', { name: 'Exact report references', exact: true })
    .fill('[' + selection + ']');
  await page
    .getByRole('textbox', { name: 'Promotion rationale', exact: true })
    .fill('Verified live acceptance report.');
  await page
    .getByRole('button', { name: 'Review promotion eligibility', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Eligibility: ELIGIBLE', exact: true }),
  ).toBeVisible();
  await page.getByRole('checkbox').check();
  await page
    .getByRole('button', { name: 'Confirm promotion', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Promotion recorded', exact: true }),
  ).toBeVisible();
});
