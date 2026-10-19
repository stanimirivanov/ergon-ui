import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runExecutionHistoryGuide } from './guide/run-execution-history-guide';
import { installSimulatedExecutionHistoryBff } from './guide/simulated-execution-history-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'inspects sanitized admission checkpoints without treating them as an execution trace',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runExecutionHistoryGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedExecutionHistoryBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const card = page.getByRole('region', {
          name: 'Execution admission history',
          exact: true,
        });
        const trigger = card.getByRole('button', {
          name: 'Inspect recorded admissions',
        });
        const dialog = page.getByRole('dialog', {
          name: 'Recorded execution admissions',
          exact: true,
        });
        const recheck = dialog.getByRole('button', {
          name: 'Recheck admission access',
        });
        const rows = dialog
          .getByRole('list', { name: 'Recorded admission checkpoints' })
          .getByRole('listitem');
        await expect(trigger).toBeEnabled();
        expect(bff.historyReads()).toBe(0);
        await guide.result('discover', card);

        await trigger.click();
        await expect(dialog).toContainText(
          'No browser execution command recorded',
        );
        await expect(rows).toHaveCount(0);
        await guide.result('empty', dialog);

        bff.setHistory('recorded');
        await recheck.click();
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText('Recovery admission');
        await expect(rows.nth(1)).toContainText('Initial admission');
        await expect(rows.nth(0)).toContainText(
          '2026-10-19T08:01:00.123456789Z',
        );
        await expect(dialog).toContainText('Recording order only');
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('recorded', dialog);

        await recheck.focus();
        for (const key of ['Tab', 'Shift+Tab']) {
          for (let count = 0; count < 3; count++) {
            await page.keyboard.press(key);
            expect(
              await dialog.evaluate((element) =>
                element.contains(document.activeElement),
              ),
            ).toBe(true);
          }
        }
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect(dialog).toHaveCount(0);
        await guide.result('keyboard', card);

        await page.setViewportSize({ width: 320, height: 900 });
        await trigger.click();
        await expect(rows).toHaveCount(2);
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await guide.result('narrow', dialog);
        await page.setViewportSize({ width: 1440, height: 1000 });

        bff.setHistory('denied');
        bff.holdHistory();
        const before = bff.historyReads();
        await recheck.click();
        await expect.poll(bff.historyReads).toBe(before + 1);
        await expect(dialog).toContainText(
          'Earlier admission history is hidden',
        );
        await expect(rows).toHaveCount(0);
        await guide.result('held', dialog);
        bff.releaseHistory();
        const failure = page.getByRole('heading', {
          name: 'Admission history unavailable',
          exact: true,
        });
        const recover = page.getByRole('button', {
          name: 'Recheck run access',
          exact: true,
        });
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(card).toHaveCount(0);
        await expect(rows).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await guide.result(
          'denied',
          page.getByRole('region', { name: 'Resolution run', exact: true }),
        );

        bff.setHistory('recorded');
        await recover.click();
        await trigger.click();
        await expect(rows).toHaveCount(2);
        expect(bff.commands()).toBe(0);
        await guide.result('recovered', dialog);

        bff.setHistory('unsupported');
        await recheck.click();
        await expect(dialog).toContainText('Admission history is unsupported');
        await expect(dialog).not.toContainText(
          'No browser execution command recorded',
        );
        await guide.result('unsupported', dialog);
        bff.setHistory('malformed');
        await recheck.click();
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(rows).toHaveCount(0);
        await guide.result(
          'malformed',
          page.getByRole('region', { name: 'Resolution run', exact: true }),
        );

        bff.setHistory('truncated');
        await recover.click();
        await trigger.click();
        await expect(rows).toHaveCount(100);
        await expect(dialog).toContainText(
          'Truncated history: 100 admissions shown',
        );
        await expect(
          dialog.getByRole('heading', {
            name: 'Initial admission',
            exact: true,
          }),
        ).toHaveCount(0);
        await guide.result('truncated', dialog);

        await dialog
          .getByRole('button', { name: 'Close admission history' })
          .click();
        bff.holdNextRunRead();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(card).toHaveCount(0);
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        await expect(heading).toBeFocused();
        await guide.result(
          'context',
          page.getByRole('region', { name: 'Resolution run', exact: true }),
        );
        bff.releaseHeldRunRead('success');
        await expect(trigger).toBeEnabled();

        bff.setRunReadMode('terminal');
        bff.setActiveRunsVisible(false);
        bff.setHistory('recorded');
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await expect(trigger).toBeEnabled();
        await trigger.click();
        await expect(rows).toHaveCount(2);
        await guide.result('terminal', dialog);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(bff.commands()).toBe(0);
        await guide.result('close', card);
      },
    );
  },
);

test('retires an open history modal with its parent context and ignores its held late response', async ({
  page,
}) => {
  const bff = await installSimulatedExecutionHistoryBff(page);
  bff.setHistory('recorded');
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  const trigger = page.getByRole('button', {
    name: 'Inspect recorded admissions',
  });
  bff.holdHistory();
  await trigger.click();
  await expect.poll(bff.historyReads).toBe(1);
  await page.keyboard.press('Escape');
  bff.holdNextRunRead();
  await page
    .getByRole('button', { name: 'Recheck selected run', exact: true })
    .click();
  await expect(trigger).toHaveCount(0);
  bff.releaseHistory();
  bff.releaseHeldRunRead('success');
  bff.setHistory('denied');
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(
    page.getByRole('heading', {
      name: 'Admission history unavailable',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Recovery admission', exact: true }),
  ).toHaveCount(0);
  expect(bff.commands()).toBe(0);
});
