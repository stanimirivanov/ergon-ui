import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { runGuideScenario } from './guide/user-guide-session';
import { proofFinalizationGuide } from './guide/proof-finalization-guide';
import { installSimulatedProofFinalizationBff } from './guide/simulated-proof-finalization-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';
import { syntheticProofText } from './guide/simulated-run-verification-bff';

test(
  'confirms exact proof, rejects staleness, replays uncertain acceptance and reads terminal proof',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      proofFinalizationGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedProofFinalizationBff(page);
        await page.goto(supervisorTenantPath);
        const assigned = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-assigned', assigned, () => assigned.click());
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .click();
        const proof = page.getByRole('region', {
          name: 'Outcome verification',
          exact: true,
        });
        const accept = page.getByRole('button', {
          name: 'Accept proof and resolve case',
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
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        await expect(
          page.getByText(/Browser proof finalization is disabled/),
        ).toBeVisible();
        await expect(accept).toHaveCount(0);
        await guide.result('disabled-match', proof);
        bff.setEnabled(true);
        await recheck.click();
        await expect(accept).toBeVisible();
        await guide.result('enabled-match', proof);
        await inspector.click();
        const evidenceDialog = page.getByRole('dialog', {
          name: 'Verification evidence',
          exact: true,
        });
        await expect(
          evidenceDialog.getByText(syntheticProofText, { exact: true }),
        ).toBeVisible();
        await expect(evidenceDialog.locator('img')).toHaveCount(0);
        await guide.result('inspect-source', evidenceDialog);
        await page.keyboard.press('Escape');
        await accept.click();
        const dialog = page.getByRole('dialog', {
          name: 'Confirm outcome proof acceptance',
          exact: true,
        });
        const submit = dialog.getByRole('button', {
          name: 'Record acceptance and close case',
          exact: true,
        });
        const acknowledgement = dialog.getByRole('checkbox');
        const cancel = dialog.getByRole('button', {
          name: 'Cancel proof acceptance',
          exact: true,
        });
        await expect(
          dialog.getByRole('heading', {
            name: 'Confirm outcome proof acceptance',
          }),
        ).toBeFocused();
        await expect(dialog).toContainText(
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        );
        await guide.result('open-confirmation', dialog);
        await submit.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Confirm the exact proof',
        );
        expect(bff.commands()).toHaveLength(0);
        await guide.result('required-acknowledgement', dialog);
        await cancel.click();
        await expect(dialog).toHaveCount(0);
        await expect(accept).toBeFocused();
        expect(bff.commands()).toHaveLength(0);
        await guide.result('cancel-confirmation', accept);

        await page.setViewportSize({ width: 320, height: 740 });
        await accept.click();
        for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Tab']) {
          await page.keyboard.press(key);
          await expect
            .poll(() =>
              page.evaluate(() =>
                Boolean(document.activeElement?.closest('dialog')),
              ),
            )
            .toBe(true);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('narrow-confirmation', dialog);
        await acknowledgement.check();
        bff.setNextResult('conflict');
        await submit.click();
        const conflict = page.getByRole('alert');
        await expect(conflict).toContainText(
          'reviewed proof, supervision epoch or run state changed',
        );
        await expect(proof).toHaveCount(0);
        await expect(
          page.getByText(syntheticProofText, { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Retry exact proof acceptance' }),
        ).toHaveCount(0);
        expect(bff.commands()).toHaveLength(1);
        await guide.result('stale-rejection', conflict);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole('button', { name: 'Recheck run before accepting proof' })
          .click();
        await expect(accept).toBeVisible();
        await expect(proof).toContainText('8');
        await guide.result('review-changed-proof', proof);
        await accept.click();
        await expect(acknowledgement).not.toBeChecked();
        await expect(dialog).toContainText(
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        );
        await expect(dialog).toContainText(
          'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        );
        await acknowledgement.check();
        await guide.result('confirm-new-proof', dialog);
        bff.holdCommand();
        bff.setNextResult('lost');
        await submit.click();
        await expect.poll(() => bff.commands().length).toBe(2);
        await expect(dialog).toHaveCount(0);
        await expect(heading).toBeFocused();
        await expect(proof).toHaveCount(0);
        await expect(inspector).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: 'Recording outcome proof acceptance…',
          }),
        ).toBeVisible();
        await guide.result('pending-private-barrier', heading);
        bff.releaseCommand();
        await expect(page.getByRole('alert')).toContainText(
          'Acceptance may already be committed',
        );
        expect(bff.commands()).toHaveLength(2);
        await guide.result('uncertain-result', page.getByRole('alert'));
        const exactRetry = page.getByRole('button', {
          name: 'Retry exact proof acceptance',
          exact: true,
        });
        await exactRetry.click();
        await expect(
          page.getByRole('heading', {
            name: 'Proof acceptance recorded · case closed',
          }),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(3);
        expect(bff.commands()[2]).toEqual(bff.commands()[1]);
        expect(bff.commands()[1]?.commandId).not.toBe(
          bff.commands()[0]?.commandId,
        );
        await guide.result(
          'replay-exact-intent',
          page.getByRole('heading', {
            name: 'Proof acceptance recorded · case closed',
          }),
        );
        await expect(proof).toContainText('Durable outcome proof accepted');
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await expect(accept).toHaveCount(0);
        await guide.result('fresh-terminal-proof', proof);
        await inspector.click();
        await expect(evidenceDialog).toContainText(
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        );
        await guide.result('inspect-accepted-source', evidenceDialog);
        await page.keyboard.press('Escape');
        bff.holdRead();
        await recheck.click();
        await expect(proof).toHaveCount(0);
        await expect(inspector).toHaveCount(0);
        await expect(heading).toBeFocused();
        await guide.result('revalidation-withdrawal', heading);
        bff.denyReads();
        bff.releaseRead();
        const denied = page.getByRole('heading', {
          name: 'Run context is unavailable',
          exact: true,
        });
        await expect(denied).toBeVisible();
        await expect(
          page.getByText(syntheticProofText, { exact: true }),
        ).toHaveCount(0);
        await guide.result('denied-terminal-access', denied);
        await page
          .getByRole('button', { name: 'Back to follow-ups', exact: true })
          .click();
        await expect(heading).toHaveCount(0);
        await guide.result(
          'leave-console',
          page.getByRole('heading', { level: 1 }),
        );
      },
    );
  },
);
