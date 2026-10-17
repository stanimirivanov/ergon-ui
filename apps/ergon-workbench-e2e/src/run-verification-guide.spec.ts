import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { runGuideScenario } from './guide/user-guide-session';
import { runVerificationGuide } from './guide/run-verification-guide';
import {
  installSimulatedRunVerificationBff,
  syntheticProofText,
} from './guide/simulated-run-verification-bff';
import {
  supervisorTenantPath,
  assignedRunId,
} from './guide/simulated-run-supervision-bff';

test(
  'distinguishes mutable verification from durable acceptance and withdraws private proof',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runVerificationGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunVerificationBff(page);
        await page.goto(supervisorTenantPath);
        const assigned = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-runs', assigned, () => assigned.click());
        const open = page.getByRole('button', {
          name: `Inspect run ${assignedRunId}`,
        });
        await guide.action('open-unsupported', open, () => open.click());
        await expect(
          page.getByText(/This server does not supply outcome verification/),
        ).toBeVisible();
        const proof = page.getByRole('region', {
          name: 'Outcome verification',
          exact: true,
        });
        const recheck = page.getByRole('button', {
          name: 'Recheck selected run',
          exact: true,
        });
        const inspector = page.getByRole('button', {
          name: 'Inspect verification evidence',
          exact: true,
        });
        bff.setMode('unassessed');
        await recheck.click();
        await expect(proof).toContainText('Outcome not assessed');
        await expect(inspector).toHaveCount(0);
        await guide.result('not-assessed', proof);
        bff.setMode('missing');
        await recheck.click();
        await expect(proof).toContainText('No eligible post-action binding');
        await expect(inspector).toHaveCount(0);
        await guide.result('missing-evidence', proof);
        bff.setMode('mismatch');
        await recheck.click();
        await expect(proof).toContainText('LOCKED');
        await expect(proof).toContainText(
          'latest eligible post-action binding differs',
        );
        await guide.result('mismatching-evidence', proof);
        await inspector.click();
        const dialog = page.getByRole('dialog', {
          name: 'Verification evidence',
          exact: true,
        });
        const title = dialog.getByRole('heading', {
          name: 'Verification evidence',
          exact: true,
        });
        await expect(title).toBeFocused();
        await expect(
          dialog.getByText(syntheticProofText, { exact: true }),
        ).toBeVisible();
        await expect(dialog.locator('img')).toHaveCount(0);
        await guide.result('inspect-mismatch', dialog);
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
        await inspector.evaluate((element) => element.focus());
        await expect
          .poll(() =>
            page.evaluate(() =>
              Boolean(document.activeElement?.closest('dialog')),
            ),
          )
          .toBe(true);
        await title.focus();
        await page.keyboard.press('End');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        // Native keyboard scrolling can animate even with reduced motion.
        // Finish End before Home: observing one moved pixel races two gestures.
        await expect
          .poll(() =>
            dialog.evaluate(
              (element) =>
                element.scrollHeight - element.clientHeight - element.scrollTop,
            ),
          )
          .toBe(0);
        await page.keyboard.press('Home');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBe(0);
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
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('narrow-provenance', dialog);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(inspector).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 900 });
        bff.setMode('matching');
        await recheck.click();
        await expect(proof).toContainText(
          'Condition matches · not durably accepted',
        );
        await expect(proof).not.toContainText('Acceptance recorded');
        await guide.result('matching-not-accepted', proof);
        bff.setMode('mismatch');
        await recheck.click();
        await expect(proof).toContainText(
          'latest eligible post-action binding differs',
        );
        await guide.result('later-mismatch', proof);
        bff.setMode('accepted');
        await recheck.click();
        await expect(proof).toContainText('Durable outcome proof accepted');
        await expect(proof).toContainText('Verified case closure version');
        await guide.result('durable-acceptance', proof);
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
        await expect(proof).toContainText('Durable outcome proof accepted');
        await guide.result('terminal-detail', proof);
        const reads = bff.reads();
        bff.holdNextRead();
        await guide.action('hold-recheck', recheck, () => recheck.click());
        await expect.poll(bff.reads).toBe(reads + 1);
        await expect(proof).toHaveCount(0);
        await expect(inspector).toHaveCount(0);
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
        await guide.result('denied', unavailable);
        bff.setMode('accepted');
        await page
          .getByRole('button', { name: 'Retry run read', exact: true })
          .click();
        await expect(proof).toContainText('Durable outcome proof accepted');
        await expect(dialog).toHaveCount(0);
        await guide.result('recover', proof);
        bff.setMode('malformed');
        await recheck.click();
        const invalid = page.getByRole('heading', {
          name: 'Run context could not be read',
          exact: true,
        });
        await expect(invalid).toBeVisible();
        await expect(proof).toHaveCount(0);
        await guide.result('malformed', invalid);
        expect(bff.commands()).toBe(0);
        const back = page.getByRole('button', {
          name: 'Back to follow-ups',
          exact: true,
        });
        await guide.action('finish', back, () => back.click());
        await expect(proof).toHaveCount(0);
        expect(bff.commands()).toBe(0);
      },
    );
  },
);
