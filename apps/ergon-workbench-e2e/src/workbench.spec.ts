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
  await expect(page.getByText('Workbench shell ready')).toBeVisible();

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
