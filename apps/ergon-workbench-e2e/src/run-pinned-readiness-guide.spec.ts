import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runPinnedReadinessGuide } from './guide/run-pinned-readiness-guide';
import { installSimulatedPinnedReadinessBff } from './guide/simulated-pinned-readiness-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'inspects pinned readiness and its selected citation without authorizing execution or proof',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runPinnedReadinessGuide,
      async (guide) => {
        const page = guide.page,
          bff = await installSimulatedPinnedReadinessBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const card = page.getByRole('region', {
          name: 'Readiness at run pin',
          exact: true,
        });
        const trigger = card.getByRole('button', {
          name: 'Inspect pinned readiness',
        });
        const dialog = page.getByRole('dialog', {
          name: 'Pinned readiness inspection',
          exact: true,
        });
        const recheck = dialog.getByRole('button', {
          name: 'Recheck pinned readiness',
        });
        const assessment = dialog.getByRole('region', {
          name: 'Pinned readiness assessment',
          exact: true,
        });
        const selected = dialog.getByRole('region', {
          name: 'Selected readiness evidence',
          exact: true,
        });
        const missing = dialog.getByRole('region', {
          name: 'Missing required evidence',
          exact: true,
        });
        const source = dialog.getByRole('region', {
          name: 'Recorded source text',
          exact: true,
        });
        const context = page.getByRole('region', {
          name: 'Resolution run',
          exact: true,
        });
        const failure = page.getByRole('heading', {
          name: 'Pinned readiness unavailable',
          exact: true,
        });
        const recover = page.getByRole('button', {
          name: 'Recheck run access',
          exact: true,
        });
        await expect(trigger).toBeEnabled();
        await expect(
          page.getByText('Showing the first 100 bindings only.', {
            exact: false,
          }),
        ).toBeVisible();
        expect(bff.readinessReads()).toBe(0);
        await guide.result('discover', card);
        await trigger.click();
        await expect(assessment).toContainText('Ready at pinned boundary');
        await expect(assessment).toContainText(
          'ergon.dev/evaluation/pinned-readiness/v1',
        );
        await expect(assessment).toContainText(
          '2026-10-21T08:00:00.123456789Z',
        );
        await expect(assessment).toContainText('203');
        await guide.result('identity', dialog);
        await selected.scrollIntoViewIfNeeded();
        await expect(selected).toContainText('Selected binding #203 · LOCKED');
        await expect(selected).toContainText('202');
        expect(await source.locator('img').count()).toBe(0);
        await expect(source).toContainText('<img src=x onerror=alert(1)>');
        await guide.result('provenance', dialog);
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
        const beforeReopen = bff.readinessReads();
        await trigger.click();
        await expect(assessment).toContainText('Ready at pinned boundary');
        expect(bff.readinessReads()).toBe(beforeReopen + 1);
        await guide.result('keyboard', dialog);
        await page.setViewportSize({ width: 320, height: 900 });
        await source.scrollIntoViewIfNeeded();
        expect(
          await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await dialog
          .getByRole('heading', {
            name: 'Protected readiness observation',
            exact: true,
          })
          .focus();
        const oldScroll = await dialog.evaluate((el) => el.scrollTop);
        await page.keyboard.press('PageDown');
        await expect
          .poll(() => dialog.evaluate((el) => el.scrollTop))
          .toBeGreaterThan(oldScroll);
        await source.scrollIntoViewIfNeeded();
        await guide.result('narrow', dialog);
        await page.setViewportSize({ width: 1440, height: 1000 });
        bff.setReadiness('missing');
        await recheck.click();
        await expect(assessment).toContainText('Waiting for pinned evidence');
        await expect(missing.getByRole('listitem')).toHaveText([
          'account.owner',
        ]);
        await expect(
          dialog.getByRole('region', { name: 'Assessed applicability' }),
        ).toHaveCount(0);
        await expect(selected).toContainText(
          'No required supported binding selected',
        );
        await guide.result('missing', missing);
        bff.setReadiness('partial');
        await recheck.click();
        await expect(missing.getByRole('listitem')).toHaveText([
          'z.state',
          'a.state',
        ]);
        await expect(selected).toContainText('Selected binding #203 · LOCKED');
        await expect(
          dialog.getByRole('region', { name: 'Assessed applicability' }),
        ).toHaveCount(0);
        await guide.result('precedence', missing);
        bff.setReadiness('mismatch');
        await recheck.click();
        const applicability = dialog.getByRole('region', {
          name: 'Assessed applicability',
        });
        await expect(assessment).toContainText(
          'Not applicable at pinned boundary',
        );
        await expect(applicability).toContainText('locked');
        await expect(applicability).toContainText('LOCKED');
        await applicability.scrollIntoViewIfNeeded();
        await guide.result('mismatch', applicability);
        bff.setReadiness('denied');
        bff.holdReadiness();
        const before = bff.readinessReads();
        await recheck.click();
        await expect.poll(bff.readinessReads).toBe(before + 1);
        await expect(assessment).toHaveCount(0);
        await expect(source).toHaveCount(0);
        await expect(dialog).toContainText(
          'Earlier readiness and source content is hidden',
        );
        await guide.result('held', dialog);
        bff.releaseReadiness();
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        await guide.result('denied', context);
        bff.setReadiness('ready');
        await recover.click();
        await trigger.click();
        await expect(assessment).toContainText('Ready at pinned boundary');
        await guide.result('recovery', dialog);
        bff.setReadiness('unsupported');
        await recheck.click();
        await expect(dialog).toContainText('No assessment has been returned');
        await expect(assessment).toHaveCount(0);
        await guide.result('unsupported', dialog);
        bff.setReadiness('malformed');
        await recheck.click();
        await expect(failure).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await guide.result('malformed', context);
        bff.setReadiness('bounded');
        await recover.click();
        await trigger.click();
        await expect(missing.getByRole('listitem')).toHaveCount(50);
        await missing.getByRole('listitem').last().scrollIntoViewIfNeeded();
        await expect(missing.getByRole('listitem').last()).toHaveText(
          'missing.fact-49',
        );
        await guide.result('bounded', dialog);
        await page.keyboard.press('Escape');
        bff.holdNextRunRead();
        await page
          .getByRole('button', { name: 'Recheck selected run' })
          .click();
        await expect(trigger).toHaveCount(0);
        await expect(dialog).toHaveCount(0);
        await guide.result('parent', context);
        bff.releaseHeldRunRead('success');
        await expect(trigger).toBeVisible();
        bff.setReadiness('ready');
        bff.setRunReadMode('terminal');
        bff.setActiveRunsVisible(false);
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(trigger).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Inspect run ' + assignedRunId }),
        ).toHaveCount(0);
        await trigger.click();
        await expect(assessment).toContainText('Ready at pinned boundary');
        await guide.result('terminal', dialog);
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await page
          .getByRole('button', { name: 'Close run', exact: true })
          .click();
        await expect(dialog).toHaveCount(0);
        expect(bff.commands()).toBe(0);
        await guide.result('close', context);
      },
    );
  },
);

test('retires a held readiness observation with its parent without late disclosure or failure', async ({
  page,
}) => {
  const bff = await installSimulatedPinnedReadinessBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  bff.setReadiness('denied');
  bff.holdReadiness();
  await page.getByRole('button', { name: 'Inspect pinned readiness' }).click();
  await expect.poll(bff.readinessReads).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close run', exact: true }).click();
  // A retired last reader can abort fetch: wait for the fixture, not a network
  // response event that cancellation is specifically allowed to prevent.
  const completed = bff.completedReadinessReads();
  bff.releaseReadiness();
  await expect.poll(bff.completedReadinessReads).toBe(completed + 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Pinned readiness unavailable' }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Select an assigned run', { exact: true }),
  ).toBeVisible();
  expect(bff.commands()).toBe(0);
});
