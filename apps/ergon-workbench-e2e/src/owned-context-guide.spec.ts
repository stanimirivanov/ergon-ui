import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ownedContextGuide } from './guide/owned-context-guide';
import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';
import { runGuideScenario } from './guide/user-guide-session';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const caseGoal = 'Restore access to the customer workspace';
const observation = 'The sign-in link returns an expired-token message.';

test(
  'recovers owned work and hides case evidence during failed revalidation',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      ownedContextGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedOwnedContextBff(page);
        await page.goto(tenantPath);

        const owned = page.getByRole('region', { name: 'Claimed follow-ups' });
        const ownedItem = owned.getByRole('heading', {
          level: 3,
          name: 'Retry attempt limit reached',
        });
        const openContext = owned.getByRole('button', {
          name: 'Review case context',
        });
        const caseHeading = owned.getByRole('heading', {
          level: 4,
          name: caseGoal,
        });

        await expect(ownedItem).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        expect(bff.summaryReads()).toBe(0);
        await guide.result('owned-work-on-entry', ownedItem);

        await guide.action('reload-workbench', ownedItem, async () => {
          await page.reload();
        });
        await expect(ownedItem).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        expect(bff.summaryReads()).toBe(0);
        expect(bff.claimCommands()).toBe(0);
        await guide.result('owned-work-restored', ownedItem);

        await guide.action('open-case-context', openContext, () =>
          openContext.click(),
        );
        await expect(caseHeading).toBeVisible();
        await expect(owned.getByText(observation)).toBeVisible();
        await expect(
          owned.getByRole('heading', { level: 5, name: 'Automation handoff' }),
        ).toBeVisible();
        expect(bff.summaryReads()).toBe(1);
        await guide.result('review-evidence', caseHeading);
        await guide.result(
          'inspect-source-observation',
          owned.getByText(observation),
        );

        const hideContext = owned.getByRole('button', {
          name: 'Hide case context',
        });
        await guide.action('hide-case-context', hideContext, () =>
          hideContext.click(),
        );
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await guide.result('context-hidden', openContext);

        await guide.action('reopen-case-context', openContext, () =>
          openContext.click(),
        );
        await expect.poll(() => bff.summaryReads()).toBe(2);
        const loading = owned.getByRole('heading', {
          level: 4,
          name: 'Loading case context…',
        });
        await expect(loading).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await guide.result('evidence-hidden-while-loading', loading);

        bff.denyPendingSummary();
        const unavailable = owned.getByRole('heading', {
          level: 4,
          name: 'Case context is no longer available.',
        });
        await expect(unavailable).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await expect(
          owned.getByRole('button', { name: 'Try case context again' }),
        ).toHaveCount(0);
        await guide.result('context-unavailable', unavailable);

        const deniedAccessibility = await new AxeBuilder({ page }).analyze();
        expect(deniedAccessibility.violations).toEqual([]);

        await guide.action('reload-active-work', unavailable, async () => {
          await page.reload();
        });
        const empty = owned.getByRole('heading', {
          level: 3,
          name: 'No active claimed work in this view.',
        });
        await expect(empty).toBeVisible();
        await expect(ownedItem).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        expect(bff.summaryReads()).toBe(2);
        expect(bff.ownedReads()).toBeGreaterThanOrEqual(3);
        expect(bff.claimCommands()).toBe(0);
        await guide.result('owned-work-empty', empty);
      },
    ),
);

test('places evidence before handoff without overflow at desktop and narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installSimulatedOwnedContextBff(page);
  await page.goto(tenantPath);
  await page.getByRole('button', { name: 'Review case context' }).click();

  const context = page.getByRole('region', { name: caseGoal });
  const evidence = context.getByRole('region', {
    name: 'Recorded observations',
  });
  const handoff = context.getByRole('region', { name: 'Automation handoff' });
  const contract = context.getByRole('region', { name: 'Case and contract' });
  await expect(evidence).toBeVisible();
  await expect(handoff).toBeVisible();
  await expect(contract).toBeVisible();
  const desktopEvidence = await evidence.boundingBox();
  const desktopHandoff = await handoff.boundingBox();
  if (desktopEvidence === null || desktopHandoff === null) {
    throw new Error('Case inspection regions have no desktop bounds');
  }
  expect(desktopEvidence.x + desktopEvidence.width).toBeLessThan(
    desktopHandoff.x,
  );

  await page.setViewportSize({ width: 375, height: 812 });
  const narrowEvidence = await evidence.boundingBox();
  const narrowHandoff = await handoff.boundingBox();
  const narrowContract = await contract.boundingBox();
  if (
    narrowEvidence === null ||
    narrowHandoff === null ||
    narrowContract === null
  ) {
    throw new Error('Case inspection regions have no narrow viewport bounds');
  }
  expect(narrowEvidence.y + narrowEvidence.height).toBeLessThan(
    narrowHandoff.y,
  );
  expect(narrowHandoff.y + narrowHandoff.height).toBeLessThan(narrowContract.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
