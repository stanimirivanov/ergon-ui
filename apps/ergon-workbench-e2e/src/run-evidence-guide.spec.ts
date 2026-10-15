import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { runGuideScenario } from './guide/user-guide-session';
import { runEvidenceGuide } from './guide/run-evidence-guide';
import {
  installSimulatedRunEvidenceBff,
  syntheticEvidenceText,
} from './guide/simulated-run-evidence-bff';
import {
  supervisorTenantPath,
  assignedRunId,
} from './guide/simulated-run-supervision-bff';

test(
  'inspects only pinned bindings and retires untrusted source inspection under failed revalidation',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runEvidenceGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunEvidenceBff(page);
        await page.goto(supervisorTenantPath);
        const assigned = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-runs', assigned, () => assigned.click());
        const inspect = page.getByRole('button', {
          name: `Inspect run ${assignedRunId}`,
        });
        await guide.action('open-legacy', inspect, () => inspect.click());
        const evidence = page.getByRole('region', {
          name: 'Pinned case evidence',
          exact: true,
        });
        await expect(evidence).toContainText(
          'Unsupported is not an empty snapshot',
        );
        await guide.result('legacy-state', evidence);
        const recheck = page.getByRole('button', {
          name: 'Recheck selected run',
          exact: true,
        });
        bff.setMode('empty');
        await guide.action('read-empty', recheck, () => recheck.click());
        await expect(evidence).toContainText(
          'No supported account-access bindings',
        );
        bff.setMode('populated');
        await guide.action('read-bindings', recheck, () => recheck.click());
        await expect(evidence.getByRole('listitem')).toHaveCount(2);
        await expect(evidence).toContainText('account.access.state · LOCKED');
        await expect(evidence).toContainText('account.access.state · ACTIVE');
        await guide.result('history-meaning', evidence);
        const source = page.getByRole('button', {
          name: 'Inspect source for binding 3',
          exact: true,
        });
        await guide.action('inspect-source', source, () => source.click());
        const dialog = page.getByRole('dialog');
        await expect(
          page.getByRole('heading', {
            name: 'Source for binding 3',
            exact: true,
          }),
        ).toBeFocused();
        await expect(dialog).toContainText('synthetic-account');
        await guide.result('read-provenance', dialog);
        await expect(
          dialog.getByText(syntheticEvidenceText, { exact: true }),
        ).toBeVisible();
        await expect(dialog.locator('img')).toHaveCount(0);
        await guide.result('inert-content', dialog);
        await page.setViewportSize({ width: 320, height: 740 });
        for (let index = 0; index < 8; index++) {
          await page.keyboard.press(index % 2 === 0 ? 'Tab' : 'Shift+Tab');
          await expect
            .poll(() =>
              page.evaluate(() =>
                Boolean(document.activeElement?.closest('dialog')),
              ),
            )
            .toBe(true);
        }
        await page
          .getByRole('heading', { name: 'Source for binding 3', exact: true })
          .focus();
        await expect
          .poll(() =>
            dialog.evaluate(
              (element) => element.scrollHeight > element.clientHeight,
            ),
          )
          .toBe(true);
        await page.keyboard.press('End');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await page.keyboard.press('Home');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBe(0);
        await source.evaluate((element) => element.focus());
        await expect
          .poll(() =>
            page.evaluate(() =>
              Boolean(document.activeElement?.closest('dialog')),
            ),
          )
          .toBe(true);
        await expect
          .poll(() =>
            dialog.evaluate(
              (element) => element.scrollWidth <= element.clientWidth,
            ),
          )
          .toBe(true);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('narrow-inspector', dialog);
        await guide.action(
          'close-inspector',
          page.getByRole('button', {
            name: 'Close source inspector',
            exact: true,
          }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(source).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 900 });
        const previousReads = bff.reads();
        bff.holdNextRead();
        await guide.action('hold-recheck', recheck, () => recheck.click());
        await expect.poll(bff.reads).toBe(previousReads + 1);
        await expect(evidence).toHaveCount(0);
        await expect(source).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        bff.setMode('denied');
        bff.releaseRead();
        const unavailable = page.getByRole('heading', {
          name: 'Run context is unavailable',
          exact: true,
        });
        await expect(unavailable).toBeVisible();
        await guide.result('deny-access', unavailable);
        const retry = page.getByRole('button', {
          name: 'Retry run read',
          exact: true,
        });
        bff.setMode('populated');
        await guide.action('recover-access', retry, () => retry.click());
        await expect(source).toBeVisible();
        await expect(dialog).toHaveCount(0);
        bff.setMode('malformed');
        await guide.action('reject-malformed', recheck, () => recheck.click());
        await expect(
          page.getByRole('heading', {
            name: 'Run context could not be read',
            exact: true,
          }),
        ).toBeVisible();
        await expect(evidence).toHaveCount(0);
        bff.setMode('truncated');
        await retry.click();
        await expect(evidence.getByRole('status')).toContainText(
          'first 100 bindings only',
        );
        await expect(evidence.getByRole('button')).toHaveCount(100);
        await guide.result('bounded-history', evidence.getByRole('status'));
        expect(bff.commands()).toBe(0);
        const back = page.getByRole('button', {
          name: 'Back to follow-ups',
          exact: true,
        });
        await guide.action('finish-read-only', back, () => back.click());
        await expect(evidence).toHaveCount(0);
        expect(bff.commands()).toBe(0);
      },
    );
  },
);
