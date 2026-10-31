import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
const tenant = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const artifact = { key: 'fixture', revision: 'v1', sha256: 'a'.repeat(64) };
const id = (n: number) =>
  `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`;
const summary = (n: number) => ({
  reportId: id(n),
  fixture: artifact,
  reportDigest: 'b'.repeat(64),
  passed: false,
  recordedAt: '2026-10-30T12:00:00.123456Z',
});
async function install(page: Page) {
  let sessions = 0,
    denied = false;
  const calls: string[] = [];
  await page.route('**/bff/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    calls.push(url.pathname + url.search);
    if (url.pathname.endsWith('/session')) {
      sessions++;
      return route.fulfill({
        json: {
          actorId: actor,
          identityProvider: 'sso',
          registeredAt: '2026-10-30T09:00:00Z',
          recordedAt: '2026-10-30T09:00:00Z',
        },
      });
    }
    if (denied)
      return route.fulfill({
        status: 404,
        json: { detail: 'PRIVATE diagnostic' },
      });
    if (url.pathname.endsWith('/reports'))
      return route.fulfill({
        json: url.searchParams.has('after')
          ? { items: [], nextAfter: null }
          : {
              items: Array.from({ length: 20 }, (_, i) => summary(20 - i)),
              nextAfter: id(1),
            },
      });
    if (url.pathname.endsWith('/reports/' + id(20)))
      return route.fulfill({
        json: {
          summary: summary(20),
          evaluator: artifact,
          assertions: artifact,
          checks: [
            {
              id: '<script>private text</script>',
              required: true,
              status: 'FAIL',
              explanation: 'MISMATCH',
            },
            {
              id: 'unsupported',
              required: false,
              status: 'UNSUPPORTED',
              explanation: 'UNSUPPORTED_ASSERTION',
            },
            {
              id: 'error',
              required: false,
              status: 'ERROR',
              explanation: 'OBSERVATION_ERROR',
            },
          ],
          budgets: {
            currency: 'USD',
            cost: {
              limit: 10,
              measured: null,
              status: 'UNKNOWN',
              reason: 'MISSING_PRICING',
            },
            simulatedLatency: {
              limit: null,
              measured: 0,
              status: 'NOT_CONFIGURED',
              reason: null,
            },
          },
        },
      });
    return route.fulfill({ status: 404, json: {} });
  });
  return {
    sessions: () => sessions,
    calls,
    deny: () => {
      denied = true;
    },
  };
}
test('Simulation Lab inspects exact history with keyboard, accessible narrow reflow and fresh access', async ({
  page,
}) => {
  const bff = await install(page);
  await page.goto(`/tenants/${tenant}/simulation`);
  const inspect = page.getByRole('button', {
    name: `Inspect report ${id(20)}`,
    exact: true,
  });
  await expect(inspect).toBeVisible();
  await inspect.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('article', { name: 'Exact evaluation report' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Simulation Lab', exact: true }),
  ).toBeFocused();
  expect(bff.sessions()).toBe(2);
  expect(page.url()).not.toContain(id(20));
  await expect(page.getByText('Optional · UNSUPPORTED')).toBeVisible();
  await expect(page.getByText('Optional · ERROR')).toBeVisible();
  await expect(page.getByText('<script>private text</script>')).toBeVisible();
  await expect(page.getByText('Unknown', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  bff.deny();
  await page.getByRole('button', { name: 'Recheck current access' }).click();
  await expect(page.getByRole('alert')).toContainText('Evaluation access');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByText('PRIVATE diagnostic')).toHaveCount(0);
  expect(bff.calls.every((path) => !path.includes(actor))).toBe(true);
});
test('bounded older-page navigation retires history and keeps cursors ephemeral', async ({
  page,
}) => {
  const bff = await install(page);
  await page.goto(`/tenants/${tenant}/simulation`);
  await page.getByRole('button', { name: 'Older evaluations' }).click();
  await expect(
    page.getByText('No evaluations in this checked page.'),
  ).toBeVisible();
  expect(
    bff.calls.some((path) => path.endsWith(`?limit=20&after=${id(1)}`)),
  ).toBe(true);
  expect(page.url()).not.toContain('after');
  await page
    .getByRole('button', { name: 'Back to latest evaluations' })
    .click();
  await expect(
    page.getByRole('button', { name: /Inspect report/ }),
  ).toHaveCount(20);
  expect(bff.sessions()).toBe(3);
});
test('tenant navigation withdraws a report and local sign-out retires pending disclosure', async ({
  page,
}) => {
  await install(page);
  await page.goto(`/tenants/${tenant}/simulation`);
  await page
    .getByRole('button', { name: `Inspect report ${id(20)}`, exact: true })
    .click();
  await expect(page.getByRole('article')).toBeVisible();
  await page.goto(`/tenants/${actor}/simulation`);
  await expect(
    page.getByRole('region', { name: 'Evaluation history' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page
    .getByRole('button', { name: 'Sign out locally', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Evaluation history' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Inspect report/ }),
  ).toHaveCount(0);
});
