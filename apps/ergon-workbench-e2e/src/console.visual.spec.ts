import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test.beforeEach(async ({ page, browserName }) => {
  expect(browserName).toBe('chromium');
  expect(await page.evaluate(() => navigator.platform)).toContain('Linux');
});

test('assigned chrome retains populated and withheld layout', async ({
  page,
}) => {
  const bff = await installSimulatedRunSupervisionBff(page);
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await expect(page.getByText('305.123456 ms', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('assigned-populated.png', {
    animations: 'disabled',
  });
  // Use settled protected absence, not a timed pending window, for stable pixels.
  // Existing shell tests separately assert immediate pending-state withdrawal.
  bff.setRunReadMode('not-found');
  await page.getByRole('button', { name: 'Recheck selected run' }).click();
  await expect(
    page.getByRole('heading', { name: 'Run context is unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByText('access-restoration', { exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot('assigned-withheld.png');
  expect(bff.consoleReads()).toBe(2);
  expect(bff.commands()).toBe(0);
});

test('recorded workspace separates pinned context, receipt and append history', async ({
  page,
}) => {
  // Allocate the full section before navigation; do not resize an active
  // scroll container or disturb the separate chrome/withdrawal baseline.
  await page.setViewportSize({ width: 1440, height: 1800 });
  const bff = await installSimulatedRunSupervisionBff(page);
  bff.setRunReadMode('projected');
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  const records = page.getByRole('region', { name: 'Recorded execution' });
  await expect(
    records
      .getByText('Snapshot revision', { exact: true })
      .locator('..')
      .getByRole('definition'),
  ).toHaveText('1');
  await expect(
    records.getByRole('heading', { name: '1 · Capability success projected' }),
  ).toBeVisible();
  await expect(records).toHaveScreenshot('execution-projected.png');
  expect(bff.consoleReads()).toBe(1);
  expect(bff.commands()).toBe(0);
});

test('owned chrome and inspection remain usable at narrow width and in forced colours', async ({
  page,
}) => {
  await installSimulatedOwnedContextBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Restore access to the customer workspace',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Compare sources' }).click();
  const dialog = page.getByRole('dialog', { name: 'Source comparison' });
  await expect(
    dialog.getByRole('heading', { name: 'Source comparison' }),
  ).toBeFocused();
  await expect(page).toHaveScreenshot('owned-inspection.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 812 });
  const presence = await page
    .getByRole('region', { name: 'Current claim' })
    .boundingBox();
  const back = await page
    .getByRole('button', { name: 'Back to active work' })
    .boundingBox();
  if (presence === null || back === null) {
    throw new Error('Owned Console chrome must have measurable bounds.');
  }
  expect(presence.y).toBeGreaterThanOrEqual(back.y + back.height);
  expect(presence.width).toBeGreaterThan(280);
  await expect(page).toHaveScreenshot('owned-narrow.png');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Compare sources' }).click();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => getComputedStyle(element).backdropFilter,
    ),
  ).toBe('none');
  await expect(page).toHaveScreenshot('inspection-forced-colours.png');
});
