import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  anchor,
  quote,
  install,
  openAssessment,
  prefer,
} from './guide/simulated-evidence-knowledge-bff';
import { evidenceCompilerGuide } from './guide/evidence-compiler-guide';
import { runGuideScenario } from './guide/user-guide-session';
test(
  'cited comparison, keyboard adjudication and exact bundle recovery retain attribution and historical cutoff',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      evidenceCompilerGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await install(page);
        await openAssessment(page);
        await expect(
          page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
        ).toBeVisible();
        await expect(page.getByText(quote, { exact: true })).toHaveCount(2);
        await expect(page.locator('img[src=x]')).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Evidence review', exact: true }),
        ).toBeFocused();
        await guide.result(
          'assessment',
          page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
        );
        await page.setViewportSize({ width: 320, height: 800 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result(
          'narrow',
          page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
        );
        await page
          .getByRole('combobox', { name: 'Adjudication choice' })
          .selectOption('PREFER_CLAIM');
        await page
          .getByRole('combobox', { name: 'Preferred claim', exact: true })
          .selectOption(anchor);
        await page
          .getByRole('textbox', { name: 'Adjudication rationale' })
          .fill('Prefer independently reviewed recovery guidance');
        await page
          .getByRole('button', { name: 'Confirm adjudication' })
          .focus();
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('heading', { name: 'Documentary command result' }),
        ).toBeFocused();
        await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Retry exact command' }),
        ).toBeVisible();
        expect(bff.writes).toHaveLength(1);
        await guide.result(
          'uncertain-decision',
          page.getByRole('heading', { name: 'Documentary command result' }),
        );
        await page.getByRole('button', { name: 'Retry exact command' }).click();
        await expect(
          page.getByText('Current candidate-set revision', { exact: true }),
        ).toBeVisible();
        expect(bff.writes[1]).toEqual(bff.writes[0]);
        await guide.result(
          'adjudicated',
          page.getByText('Current candidate-set revision', { exact: true }),
        );
        await expect(page.getByRole('checkbox')).toHaveCount(1);
        await page
          .getByRole('button', { name: 'Confirm bundle publication' })
          .click();
        await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
        await guide.result(
          'uncertain-bundle',
          page.getByRole('heading', { name: 'Documentary command result' }),
        );
        await page.getByRole('button', { name: 'Retry exact command' }).click();
        await expect(
          page.getByRole('heading', { name: 'Historical evidence bundle' }),
        ).toBeVisible();
        expect(bff.publications[1]).toEqual(bff.publications[0]);
        await expect(
          page.getByText('2026-10-29T12:00:02Z', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(/Assessed alternative \(context\)/u),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result(
          'historical-bundle',
          page.getByRole('heading', { name: 'Historical evidence bundle' }),
        );
        await expect(page.getByText('STRIP-PRIVATE-PROOF')).toHaveCount(0);
        const sessions = bff.sessions();
        bff.deny();
        await page
          .getByRole('button', { name: 'Recheck current documentary access' })
          .click();
        await expect(page.getByRole('alert')).toContainText(
          'not currently available',
        );
        await expect(
          page.getByRole('heading', { name: 'Historical evidence bundle' }),
        ).toHaveCount(0);
        expect(bff.sessions()).toBeGreaterThan(sessions);
        await expect(
          page.getByRole('heading', { name: 'Evidence review', exact: true }),
        ).toBeFocused();
        await guide.result('withdrawn', page.getByRole('alert'));
      },
    );
  },
);
test('stale publication retires candidates and reacquires historical decision without replacement intent', async ({
  page,
}) => {
  const bff = await install(page);
  await openAssessment(page);
  await prefer(page);
  bff.stale();
  await page
    .getByRole('button', { name: 'Confirm bundle publication' })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Recheck before making a new decision',
  );
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Retry exact command' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Recheck documentary evidence' })
    .click();
  await expect(
    page.getByText('Historical decision — candidate set has changed'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirm bundle publication' }),
  ).toHaveCount(0);
  expect(bff.publications).toHaveLength(1);
  await page.getByRole('button', { name: 'Assess current claim set' }).click();
  await expect(
    page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
  ).toBeVisible();
  expect(bff.publications).toHaveLength(1);
});
for (const mode of [
  'UNDETERMINED',
  'INSUFFICIENT_CANDIDATES',
  'NO_DETECTED_CONFLICT',
] as const)
  test(
    'renders conservative ' + mode + ' assessment without automatic resolution',
    async ({ page }) => {
      const bff = await install(page, mode);
      await openAssessment(page);
      await expect(
        page.getByRole('heading', { name: 'Claim-set assessment: ' + mode }),
      ).toBeVisible();
      if (mode === 'NO_DETECTED_CONFLICT')
        await expect(
          page.getByRole('button', { name: 'Confirm bundle publication' }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole('heading', { name: 'Bundle publication unavailable' }),
        ).toBeVisible();
      expect(bff.writes).toHaveLength(0);
      expect(bff.publications).toHaveLength(0);
    },
  );
