import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runAttemptGuide } from './guide/run-attempt-guide';
import {
  installSimulatedRunAttemptBff,
  originAttemptPolicy,
  predecessorAttemptId,
  predecessorAttemptPolicy,
} from './guide/simulated-run-attempt-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'inspects predecessor attempts with independent access and fresh return',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runAttemptGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunAttemptBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .click();
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        const context = page.getByRole('region', {
          name: 'Attempt context',
          exact: true,
        });
        const inspect = page.getByRole('button', {
          name: 'Inspect predecessor attempt',
          exact: true,
        });
        const back = page.getByRole('button', {
          name: 'Return to originating attempt',
          exact: true,
        });
        const unavailable = page.getByRole('heading', {
          name: 'Run context is unavailable',
          exact: true,
        });
        const execution = page.getByRole('group', {
          name: 'Run execution',
          exact: true,
        });
        await expect(context).toContainText('Recorded attempt 2');
        await expect(context).toContainText(predecessorAttemptId);
        expect(bff.reads(assignedRunId)).toBe(1);
        expect(bff.reads(predecessorAttemptId)).toBe(0);
        expect(bff.commands()).toBe(0);
        await guide.result('origin', context);

        await page.setViewportSize({ width: 320, height: 740 });
        await inspect.focus();
        await expect(inspect).toBeFocused();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('narrow', inspect);
        await inspect.press('Enter');
        await expect(context).toContainText(
          'This is the initial attempt. No predecessor is recorded.',
        );
        await expect(heading).toBeFocused();
        await expect(inspect).toHaveCount(0);
        await expect(
          execution.getByText('Superseded', { exact: true }),
        ).toBeVisible();
        expect(bff.reads(predecessorAttemptId)).toBe(1);
        await back.focus();
        await expect(back).toBeFocused();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await guide.result('predecessor', context);

        await page.setViewportSize({ width: 1440, height: 900 });
        bff.hideActiveRuns();
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(
          page.getByRole('heading', {
            name: 'No active assigned runs',
            exact: true,
          }),
        ).toBeVisible();
        await expect(context).toContainText('initial attempt');
        expect(bff.reads(predecessorAttemptId)).toBe(2);
        await guide.result(
          'discovery',
          page.getByRole('heading', {
            name: 'No active assigned runs',
            exact: true,
          }),
        );

        await back.click();
        await expect(context).toContainText('Recorded attempt 2');
        expect(bff.reads(assignedRunId)).toBe(2);
        await expect(back).toHaveCount(0);
        await guide.result('return', context);

        bff.setPredecessorMode('denied');
        await inspect.click();
        await expect(unavailable).toBeVisible();
        await expect(
          page.getByText(originAttemptPolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByText(predecessorAttemptPolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(context).toHaveCount(0);
        await guide.result(
          'denied',
          page.getByRole('status').filter({ has: unavailable }),
        );
        await back.click();
        await expect(context).toContainText('Recorded attempt 2');
        expect(bff.reads(assignedRunId)).toBe(3);
        await guide.result('recover', context);

        bff.setPredecessorMode('success');
        bff.holdPredecessor();
        await inspect.click();
        await expect.poll(() => bff.reads(predecessorAttemptId)).toBe(4);
        await expect(
          page.getByRole('heading', {
            name: /Loading run context|Rechecking run access/,
          }),
        ).toBeVisible();
        await expect(context).toHaveCount(0);
        await expect(heading).toBeFocused();
        await guide.result(
          'pending',
          page.getByRole('status').filter({
            has: page.getByRole('heading', {
              name: /Loading run context|Rechecking run access/,
            }),
          }),
        );
        await back.click();
        await expect(context).toContainText('Recorded attempt 2');
        bff.releasePredecessor();
        await expect(context).toContainText('Recorded attempt 2');
        await expect(
          page.getByText(predecessorAttemptPolicy, { exact: true }),
        ).toHaveCount(0);
        expect(bff.reads(assignedRunId)).toBe(4);
        await guide.result('retired', context);

        await inspect.click();
        await expect(context).toContainText('initial attempt');
        bff.setOriginMode('denied');
        await back.click();
        await expect(unavailable).toBeVisible();
        await expect(context).toHaveCount(0);
        await expect(back).toHaveCount(0);
        await guide.result(
          'origin-denied',
          page.getByRole('status').filter({ has: unavailable }),
        );
        bff.setOriginMode('success');
        await page
          .getByRole('button', { name: 'Retry run read', exact: true })
          .click();
        await expect(context).toContainText('Recorded attempt 2');
        expect(bff.reads(assignedRunId)).toBe(6);
        await guide.result('recheck', context);

        bff.setPredecessorMode('malformed');
        await inspect.click();
        const failed = page.getByRole('heading', {
          name: 'Run context could not be read',
          exact: true,
        });
        await expect(failed).toBeVisible();
        await expect(context).toHaveCount(0);
        await guide.result(
          'malformed',
          page.getByRole('status').filter({ has: failed }),
        );
        await back.click();
        await expect(context).toContainText('Recorded attempt 2');
        await page
          .getByRole('button', { name: 'Close run', exact: true })
          .click();
        const selected = page.getByRole('heading', {
          name: 'Select an assigned run',
          exact: true,
        });
        await expect(selected).toBeVisible();
        await expect(back).toHaveCount(0);
        await expect(context).toHaveCount(0);
        await expect(page).toHaveURL(`${supervisorTenantPath}?view=runs`);
        expect(bff.commands()).toBe(0);
        await guide.result('close', selected);
      },
    );
  },
);
