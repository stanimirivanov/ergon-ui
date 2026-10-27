import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { requesterIntakeGuide } from './guide/requester-intake-guide';
import {
  intakeTenant,
  intakeGoal,
  intakeObservation,
  installSimulatedRequesterIntakeBff,
} from './guide/simulated-requester-intake-bff';
import { runGuideScenario } from './guide/user-guide-session';
import { installSimulatedGuideNetworkBoundary } from './guide/simulated-guide-network-boundary';

test('opens a direct intake document without allowing live BFF traffic', async ({
  page,
}) => {
  const boundary = await installSimulatedGuideNetworkBoundary(
    page.context(),
    'http://localhost:4301',
  );
  const bff = await installSimulatedRequesterIntakeBff(page);
  await page.goto('http://localhost:4301/tenants/' + intakeTenant + '/new');
  await expect(page.getByRole('form', { name: 'New request' })).toBeVisible();
  expect(bff.sessionReads()).toBe(1);
  expect(bff.csrfReads()).toBe(0);
  expect(bff.posts()).toBe(0);
  await boundary.assertNoUnexpectedRequests();
});

test(
  'creates requester intake with exact recovery and independently checked progress',
  { tag: '@user-guide' },
  async ({ browser }) =>
    runGuideScenario(
      browser,
      'http://localhost:4301',
      requesterIntakeGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRequesterIntakeBff(page);
        await page.goto('/tenants/' + intakeTenant);
        const start = page.getByRole('link', { name: 'Start a request' });
        await guide.action('intake-entry', start, () => start.click());
        const form = page.getByRole('form', { name: 'New request' });
        const goal = page.getByRole('textbox', { name: 'Desired outcome' });
        const observation = page.getByRole('textbox', {
          name: 'What happened?',
        });
        await expect(goal).toBeFocused();
        expect(bff.csrfReads()).toBe(0);
        expect(bff.posts()).toBe(0);
        await page.getByRole('button', { name: 'Create request' }).click();
        await expect(page.getByText(/Enter a nonblank outcome/)).toBeVisible();
        await guide.result('intake-validation', goal);
        await goal.fill(intakeGoal);
        await observation.fill(intakeObservation);
        await page.getByRole('checkbox').check();
        await page.setViewportSize({ width: 320, height: 800 });
        await observation.scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('intake-narrow', observation);
        await page.setViewportSize({ width: 1440, height: 900 });
        const create = page.getByRole('button', { name: 'Create request' });
        await guide.action('intake-submit', create, async () => {
          await create.click();
          await expect(
            page.getByRole('region', { name: 'Intake result' }),
          ).toBeVisible();
        });
        const result = page.getByRole('region', { name: 'Intake result' });
        await expect(result).toContainText('The outcome is uncertain');
        await expect(form).toHaveCount(0);
        expect(bff.posts()).toBe(1);
        await guide.result('intake-uncertain', result);
        const retry = page.getByRole('button', { name: 'Retry exact request' });
        await guide.action('intake-replay', retry, async () => {
          await retry.click();
          await expect(
            page.getByRole('region', { name: 'Intake acknowledged' }),
          ).toBeVisible();
        });
        const acknowledged = page.getByRole('region', {
          name: 'Intake acknowledged',
        });
        expect(bff.posts()).toBe(2);
        expect(bff.csrfReads()).toBe(2);
        expect(bff.progressReads()).toBe(0);
        await expect(acknowledged).not.toContainText(intakeGoal.trim());
        await guide.result('intake-acknowledged', acknowledged);
        const check = page.getByRole('link', {
          name: 'Check current case progress',
        });
        await guide.action('intake-check', check, async () => {
          await check.click();
          await expect.poll(() => bff.progressReads()).toBe(1);
          await expect(
            page.getByText(intakeGoal.trim(), { exact: true }),
          ).toHaveCount(0);
          bff.releaseProgress();
          await expect(
            page.getByRole('heading', { name: intakeGoal.trim() }),
          ).toBeVisible();
        });
        await expect(page).toHaveURL(
          'http://localhost:4301/tenants/' +
            intakeTenant +
            '/cases/' +
            bff.caseId(),
        );
        await expect(
          page.getByText('No questions recorded in this checked snapshot.'),
        ).toBeVisible();
        expect(bff.sessionReads()).toBe(3);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        expect(
          await page.evaluate(
            () => localStorage.length + sessionStorage.length,
          ),
        ).toBe(0);
        await guide.result(
          'intake-progress',
          page.getByRole('heading', { name: intakeGoal.trim() }),
        );
      },
    ),
);
