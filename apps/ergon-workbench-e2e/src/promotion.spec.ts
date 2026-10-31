import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  installSimulatedPromotionBff,
  promotionTenant,
  promotionReports,
} from './guide/simulated-promotion-bff';
import { simulationGuide } from './guide/simulation-guide';
import { runGuideScenario } from './guide/user-guide-session';
async function compose(page: Page) {
  await page.goto(`/tenants/${promotionTenant}/simulation`);
  await page
    .getByRole('button', { name: 'Review contract promotion', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Contract key', exact: true })
    .fill('contract');
  await page
    .getByRole('textbox', { name: 'Exact report references', exact: true })
    .fill(JSON.stringify(promotionReports));
  await page
    .getByRole('textbox', { name: 'Promotion rationale', exact: true })
    .fill('Review deterministic evidence before admission.');
  await page
    .getByRole('button', { name: 'Review promotion eligibility', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Exact promotion review', exact: true }),
  ).toBeVisible();
}
test('review cancellation creates no command and requires acknowledgement', async ({
  page,
}) => {
  const bff = await installSimulatedPromotionBff(page);
  await compose(page);
  await expect(
    page.getByRole('button', { name: 'Confirm promotion', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Cancel and return to evaluations' })
    .click();
  expect(bff.commands).toHaveLength(0);
  await expect(
    page.getByRole('heading', { name: 'Exact promotion review', exact: true }),
  ).toHaveCount(0);
});
for (const mode of ['ineligible', 'stale', 'denied'] as const)
  test(`promotion fails closed for ${mode}`, async ({ page }) => {
    const bff = await installSimulatedPromotionBff(page);
    if (mode === 'ineligible') bff.setMode(mode);
    await compose(page);
    if (mode === 'ineligible') {
      await expect(
        page.getByRole('heading', { name: 'Eligibility: INELIGIBLE' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Confirm promotion', exact: true }),
      ).toHaveCount(0);
      return;
    }
    bff.setMode(mode);
    await page.getByRole('checkbox').check();
    await page
      .getByRole('button', { name: 'Confirm promotion', exact: true })
      .click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Exact promotion review',
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Replay original promotion' }),
    ).toHaveCount(0);
  });
test('explicit promotion recovery retains exact command and accessible review @user-guide', async ({
  browser,
}) => {
  await runGuideScenario(
    browser,
    'http://localhost:4300',
    simulationGuide,
    async (guide) => {
      const page = guide.page;
      const bff = await installSimulatedPromotionBff(page);
      await compose(page);
      await guide.result(
        'promotion-review',
        page.getByRole('region', { name: 'Contract promotion' }),
      );
      await page.setViewportSize({ width: 320, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      bff.setMode('uncertain');
      await page.getByRole('checkbox').check();
      await guide.action(
        'promotion-confirm',
        page.getByRole('button', { name: 'Confirm promotion', exact: true }),
        async () => {
          await page
            .getByRole('button', { name: 'Confirm promotion', exact: true })
            .click();
          await expect(
            page.getByRole('button', { name: 'Replay original promotion' }),
          ).toBeVisible();
        },
      );
      expect(bff.commands).toHaveLength(1);
      await guide.action(
        'promotion-recover',
        page.getByRole('button', { name: 'Replay original promotion' }),
        async () => {
          await page
            .getByRole('button', { name: 'Replay original promotion' })
            .click();
          await expect(
            page.getByRole('heading', {
              name: 'Promotion recorded',
              exact: true,
            }),
          ).toBeVisible();
        },
      );
      expect(bff.commands).toHaveLength(2);
      expect(bff.commands[0]).toEqual(bff.commands[1]);
      await guide.result(
        'promotion-receipt',
        page.getByRole('region', { name: 'Contract promotion' }),
      );
    },
  );
});
