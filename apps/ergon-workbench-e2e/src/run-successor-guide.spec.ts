import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runSuccessorGuide } from './guide/run-successor-guide';
import {
  installSimulatedRunSuccessorBff,
  sourceAttemptPolicy,
  successorAttemptId,
  successorAttemptPolicy,
} from './guide/simulated-run-successor-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'recovers a direct retry successor through independently fresh source and target access',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runSuccessorGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunSuccessorBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const card = page.getByRole('region', {
          name: 'Retry successor lookup',
          exact: true,
        });
        const trigger = card.getByRole('button', {
          name: 'Find visible retry successor',
          exact: true,
        });
        const close = card.getByRole('button', {
          name: 'Close successor lookup',
          exact: true,
        });
        const recheck = card.getByRole('button', {
          name: 'Recheck successor access',
          exact: true,
        });
        const inspect = card.getByRole('button', {
          name: 'Inspect successor attempt',
          exact: true,
        });
        const primary = page.getByRole('region', {
          name: 'Resolution run',
          exact: true,
        });
        const rootRecheck = page.getByRole('button', {
          name: 'Recheck assigned runs',
          exact: true,
        });
        const recover = page.getByRole('button', {
          name: 'Recheck run access',
          exact: true,
        });
        const unavailable = page.getByRole('heading', {
          name: 'Successor lookup unavailable',
          exact: true,
        });
        const denied = page.getByRole('heading', {
          name: 'Run context is unavailable',
          exact: true,
        });
        const back = page.getByRole('button', {
          name: 'Return to originating attempt',
          exact: true,
        });
        await expect(trigger).toBeEnabled();
        expect(bff.lookupReads()).toBe(0);
        expect(bff.consoleReads(successorAttemptId)).toBe(0);
        await guide.result('discover', card);

        await trigger.click();
        await expect(card).toContainText(
          'No currently visible direct successor',
        );
        await expect(inspect).toHaveCount(0);
        await guide.result('absence', card);

        bff.showTerminalContext();
        await rootRecheck.click();
        await expect(trigger).toBeEnabled();
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await expect(primary).toContainText(sourceAttemptPolicy);
        await expect(close).toHaveCount(0);
        await guide.result('terminal-source', primary);

        bff.setLink('visible');
        await trigger.click();
        await expect(inspect).toBeVisible();
        await expect(card).toContainText('Target supervision epoch 5');
        await expect(card).toContainText('Source supervision epoch 3');
        await expect(primary).not.toContainText(successorAttemptPolicy);
        expect(bff.consoleReads(successorAttemptId)).toBe(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('visible', card);

        await close.focus();
        await page.keyboard.press('Enter');
        await expect(trigger).toBeFocused();
        const beforeReopen = bff.lookupReads();
        await page.keyboard.press('Enter');
        await expect(inspect).toBeVisible();
        await expect.poll(bff.lookupReads).toBe(beforeReopen + 1);
        await expect(
          card.getByRole('heading', {
            name: 'Protected successor observation',
          }),
        ).toBeFocused();
        await guide.result('keyboard', card);

        await page.setViewportSize({ width: 320, height: 1100 });
        expect(
          await card.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('narrow', card);
        await page.setViewportSize({ width: 1440, height: 1000 });

        bff.setLink('denied');
        bff.holdLookup();
        const beforeHeld = bff.lookupReads();
        await recheck.click();
        await expect.poll(bff.lookupReads).toBe(beforeHeld + 1);
        await expect(card).toContainText(
          'Earlier successor coordinates are hidden',
        );
        await expect(inspect).toHaveCount(0);
        await expect(card).not.toContainText(successorAttemptId);
        await guide.result('held', card);
        bff.releaseLookup();
        await expect(unavailable).toBeVisible();
        await expect(card).toHaveCount(0);
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        await guide.result('denied', primary);

        bff.setLink('visible');
        const beforeSourceRecovery = bff.consoleReads(assignedRunId);
        await recover.click();
        await trigger.click();
        await expect(inspect).toBeVisible();
        expect(bff.consoleReads(assignedRunId)).toBe(beforeSourceRecovery + 1);
        await guide.result('recovered', card);

        bff.setLink('unsupported');
        await recheck.click();
        await expect(card).toContainText(
          'Successor lookup is unsupported by this server',
        );
        await expect(card).not.toContainText(
          'No currently visible direct successor',
        );
        await expect(primary).toContainText(sourceAttemptPolicy);
        await guide.result('unsupported', card);

        bff.setLink('malformed');
        await recheck.click();
        await expect(unavailable).toBeVisible();
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await guide.result('malformed', primary);

        bff.setLink('visible');
        await recover.click();
        await trigger.click();
        await expect(inspect).toBeVisible();
        bff.advanceTargetEpoch();
        bff.holdTarget();
        await inspect.click();
        await expect.poll(() => bff.consoleReads(successorAttemptId)).toBe(1);
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await expect(primary).not.toContainText(successorAttemptPolicy);
        await expect(primary).toContainText(
          'Requesting a fresh exact-run snapshot',
        );
        await guide.result('target-pending', primary);
        bff.releaseTarget();
        await expect(primary).toContainText(successorAttemptPolicy);
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await expect(
          page.getByRole('button', {
            name: 'Inspect run ' + successorAttemptId,
          }),
        ).toHaveCount(0);
        await guide.result('target-ready', primary);

        bff.denySource(true);
        await back.click();
        await expect(denied).toBeVisible();
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await expect(primary).not.toContainText(successorAttemptPolicy);
        await expect(back).toHaveCount(0);
        await guide.result('return-denied', primary);

        bff.denySource(false);
        await rootRecheck.click();
        await trigger.click();
        await expect(inspect).toBeVisible();
        bff.denyTarget(true);
        await inspect.click();
        await expect(denied).toBeVisible();
        await expect(primary).not.toContainText(sourceAttemptPolicy);
        await expect(primary).not.toContainText(successorAttemptPolicy);
        await guide.result('target-denied', primary);

        await back.click();
        await trigger.click();
        await expect(inspect).toBeVisible();
        await close.click();
        await expect(trigger).toBeFocused();
        await expect(
          card.getByRole('heading', {
            name: 'Protected successor observation',
          }),
        ).toHaveCount(0);
        expect(bff.commands()).toBe(0);
        await guide.result('close', card);
      },
    );
  },
);

test('retires a held successor lookup when source context closes and ignores its late denial', async ({
  page,
}) => {
  const bff = await installSimulatedRunSuccessorBff(page);
  bff.setLink('denied');
  bff.holdLookup();
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await page
    .getByRole('button', { name: 'Find visible retry successor', exact: true })
    .click();
  await expect.poll(bff.lookupReads).toBe(1);
  await page.getByRole('button', { name: 'Close run', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Retry successor lookup', exact: true }),
  ).toHaveCount(0);
  bff.releaseLookup();
  bff.setLink('visible');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await page
    .getByRole('button', { name: 'Find visible retry successor', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Inspect successor attempt',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Successor lookup unavailable',
      exact: true,
    }),
  ).toHaveCount(0);
  expect(bff.commands()).toBe(0);
});
