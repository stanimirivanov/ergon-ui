import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runPinnedContractGuide } from './guide/run-pinned-contract-guide';
import { installSimulatedPinnedContractBff } from './guide/simulated-pinned-contract-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'inspects exact pinned declarations without granting execution or proof',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runPinnedContractGuide,
      async (guide) => {
        const page = guide.page,
          bff = await installSimulatedPinnedContractBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const card = page
          .getByRole('region', { name: 'Supporting inspection', exact: true })
          .getByRole('region', {
            name: 'Pinned resolution contract',
            exact: true,
          });
        const trigger = card.getByRole('button', {
          name: 'Inspect pinned contract',
        });
        const dialog = page.getByRole('dialog', {
          name: 'Pinned contract definition',
          exact: true,
        });
        const recheck = dialog.getByRole('button', {
          name: 'Recheck pinned contract',
        });
        const definition = dialog.getByRole('region', {
          name: 'Immutable contract identity',
        });
        const steps = dialog.getByRole('region', {
          name: 'Declared contract steps',
        });
        const failure = page.getByRole('heading', {
          name: 'Pinned contract unavailable',
          exact: true,
        });
        const recover = page.getByRole('button', {
          name: 'Recheck run access',
          exact: true,
        });
        await expect(trigger).toBeEnabled();
        expect(bff.contractReads()).toBe(0);
        await guide.result('discover', card);
        await trigger.click();
        await expect(definition).toContainText(
          'access-restoration · revision 2',
        );
        await expect(definition).toContainText(
          '2026-10-21T08:01:00.123456789Z',
        );
        await guide.result('identity', definition);
        const applicability = dialog.getByRole('region', {
          name: 'Declared applicability',
          exact: true,
        });
        await expect(applicability).toContainText('Locked <b>literal</b>');
        expect(await applicability.locator('b').count()).toBe(0);
        await guide.result('meaning', applicability);
        await expect(steps.getByRole('listitem')).toHaveCount(3);
        await expect(steps.getByRole('listitem').nth(0)).toContainText(
          'z-observe',
        );
        await expect(steps.getByRole('listitem').nth(1)).toContainText(
          'Pinned by this run',
        );
        await expect(steps.getByRole('listitem').nth(1)).toContainText(
          'Run-effective risk: HIGH',
        );
        await expect(steps.getByRole('listitem').nth(1)).toContainText(
          'Declared risk: LOW',
        );
        await guide.result('steps', steps);
        const outcome = dialog.getByRole('region', {
          name: 'Declared outcome condition',
          exact: true,
        });
        await outcome.scrollIntoViewIfNeeded();
        await expect(outcome).toContainText('ACTIVE');
        await expect(dialog).toContainText(
          'not an assessment or accepted proof',
        );
        await guide.result('outcome', outcome);
        await recheck.focus();
        for (const key of ['Tab', 'Shift+Tab'])
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press(key);
            expect(
              await dialog.evaluate((el) =>
                el.contains(document.activeElement),
              ),
            ).toBe(true);
          }
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect(dialog).toHaveCount(0);
        await guide.result('keyboard', card);
        await page.setViewportSize({ width: 320, height: 900 });
        await trigger.click();
        await expect(steps.getByRole('listitem')).toHaveCount(3);
        await steps.getByRole('listitem').nth(1).scrollIntoViewIfNeeded();
        expect(
          await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await guide.result('narrow', dialog);
        await page.setViewportSize({ width: 1440, height: 1000 });
        bff.setContract('denied');
        bff.holdContract();
        const before = bff.contractReads();
        await recheck.click();
        await expect.poll(bff.contractReads).toBe(before + 1);
        await expect(definition).toHaveCount(0);
        await expect(dialog).toContainText(
          'Earlier contract content is hidden',
        );
        await guide.result('held', dialog);
        bff.releaseContract();
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        await guide.result(
          'denied',
          page.getByRole('region', { name: 'Resolution run', exact: true }),
        );
        bff.setContract('valid');
        await recover.click();
        await trigger.click();
        await expect(definition).toBeVisible();
        await guide.result('recovered', definition);
        bff.setContract('unsupported');
        await recheck.click();
        await expect(dialog).toContainText(
          'inspection is unsupported by this server',
        );
        await expect(definition).toHaveCount(0);
        await guide.result('unsupported', dialog);
        bff.setContract('malformed');
        await recheck.click();
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await guide.result(
          'malformed',
          page.getByRole('region', { name: 'Resolution run', exact: true }),
        );
        bff.setContract('bounded');
        await recover.click();
        await trigger.click();
        await expect(steps.getByRole('listitem')).toHaveCount(50);
        await steps.getByRole('listitem').last().scrollIntoViewIfNeeded();
        await steps.getByRole('listitem').last().click();
        const oldScroll = await dialog.evaluate((el) => el.scrollTop);
        await page.keyboard.press('PageUp');
        await expect
          .poll(() => dialog.evaluate((el) => el.scrollTop))
          .toBeLessThan(oldScroll);
        await guide.result('bounded', dialog);
        await page.keyboard.press('Escape');
        bff.setRunReadMode('terminal');
        bff.setActiveRunsVisible(false);
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await trigger.click();
        await expect(steps.getByRole('listitem')).toHaveCount(50);
        await guide.result('terminal', definition);
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        expect(bff.commands()).toBe(0);
        await guide.result('closed', card);
      },
    );
  },
);

test('retires a held pinned contract with its parent without resurrecting private content', async ({
  page,
}) => {
  const bff = await installSimulatedPinnedContractBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  bff.holdContract();
  await page.getByRole('button', { name: 'Inspect pinned contract' }).click();
  await expect.poll(bff.contractReads).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close run', exact: true }).click();
  bff.releaseContract();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'access-restoration · revision 2' }),
  ).toHaveCount(0);
  expect(bff.commands()).toBe(0);
});
