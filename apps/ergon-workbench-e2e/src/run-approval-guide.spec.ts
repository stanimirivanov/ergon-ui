import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runApprovalGuide } from './guide/run-approval-guide';
import {
  approvalRunId,
  approvalTenantPath,
  installSimulatedRunApprovalBff,
} from './guide/simulated-run-approval-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'reviews exact human prerequisites and confirms stale, uncertain and rejected decisions without executing',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runApprovalGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunApprovalBff(page);
        await page.goto(approvalTenantPath);
        const navigate = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-assigned', navigate, () => navigate.click());
        const inspect = page.getByRole('button', {
          name: `Inspect run ${approvalRunId}`,
        });
        await expect(inspect).toBeVisible();
        await guide.action('open-unsupported', inspect, () => inspect.click());
        const card = page.getByRole('region', {
          name: 'Human approval review',
        });
        await expect(
          card.getByText('UNSUPPORTED', { exact: true }),
        ).toBeVisible();
        const recheck = page.getByRole('button', {
          name: 'Recheck selected run',
        });
        const approve = page.getByRole('button', {
          name: 'Approve prerequisite',
        });
        const reject = page.getByRole('button', {
          name: 'Reject prerequisite',
        });
        await expect(approve).toHaveCount(0);
        await expect(reject).toHaveCount(0);
        bff.setMode('not-requested');
        await guide.action('missing-request', recheck, () => recheck.click());
        await expect(
          card.getByText('NOT_REQUESTED', { exact: true }),
        ).toBeVisible();
        bff.setMode('requester');
        await guide.action('requester-boundary', recheck, () =>
          recheck.click(),
        );
        await expect(
          card.getByText('REQUESTER · this case only'),
        ).toBeVisible();
        await expect(approve).toHaveCount(0);
        bff.setMode('expired');
        await guide.action('expired-boundary', recheck, () => recheck.click());
        await expect(card.getByText('EXPIRED', { exact: true })).toBeVisible();
        await expect(approve).toHaveCount(0);
        bff.setMode('eligible');
        await guide.action('eligible-request', recheck, () => recheck.click());
        await expect(approve).toBeVisible();
        await expect(card.getByText('PENDING', { exact: true })).toBeVisible();
        await guide.action('open-confirmation', approve, () => approve.click());
        const dialog = page.getByRole('dialog');
        const title = page.getByRole('heading', {
          name: 'Confirm approval prerequisite',
        });
        await expect(title).toBeFocused();
        const record = page.getByRole('button', {
          name: 'Record approval',
          exact: true,
        });
        const acknowledge = page.getByRole('checkbox', {
          name: /I understand this records a human prerequisite only/,
        });
        const cancel = page.getByRole('button', { name: 'Cancel decision' });
        await guide.action('require-acknowledgement', record, () =>
          record.click(),
        );
        await expect(dialog.getByRole('alert')).toContainText(
          'Acknowledge the decision boundary',
        );
        expect(bff.commands()).toHaveLength(0);
        expect(bff.csrfReads()).toBe(0);
        await guide.action('cancel-decision', cancel, () => cancel.click());
        await expect(dialog).toHaveCount(0);
        await expect(approve).toBeFocused();
        await guide.action('open-stale-confirmation', approve, async () => {
          await approve.click();
          await acknowledge.check();
        });
        bff.advanceEpoch();
        await guide.action('submit-stale', record, () => record.click());
        const recover = page.getByRole('button', {
          name: 'Recheck run before deciding again',
        });
        await expect(recover).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Retry exact decision' }),
        ).toHaveCount(0);
        expect(bff.commands()).toHaveLength(1);
        expect(bff.effects()).toBe(0);
        await guide.action('recover-stale', recover, () => recover.click());
        await expect(approve).toBeVisible();
        await guide.action('prepare-held', approve, async () => {
          await approve.click();
          await acknowledge.check();
        });
        bff.holdLostResponse();
        await guide.action('send-held', record, () => record.click());
        const pending = page.getByRole('heading', {
          name: 'Recording human decision…',
        });
        await expect(pending).toBeVisible();
        await expect.poll(() => bff.commands().length).toBe(2);
        await expect(
          page.getByText(`Run ${approvalRunId}`, { exact: true }),
        ).toHaveCount(0);
        await expect(inspect).toHaveCount(0);
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        bff.releaseLostResponse();
        const retry = page.getByRole('button', {
          name: 'Retry exact decision',
        });
        await expect(retry).toBeVisible();
        await guide.result('uncertain-result', retry);
        expect(bff.effects()).toBe(1);
        await guide.action('replay-exact', retry, () => retry.click());
        await expect(
          page.getByRole('heading', {
            name: 'Human decision recorded · APPROVED',
          }),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(3);
        expect(bff.commands()[2]).toEqual(bff.commands()[1]);
        expect(bff.effects()).toBe(1);
        await expect(inspect).toBeVisible();
        await guide.action('reopen-decided', inspect, () => inspect.click());
        await expect(card.getByText('DECIDED', { exact: true })).toBeVisible();
        await expect(card.getByText(/Human response: APPROVED/)).toBeVisible();
        await expect(approve).toHaveCount(0);
        const runPane = page.getByRole('region', {
          name: 'Resolution run',
          exact: true,
        });
        await expect(
          runPane.getByText('Waiting for approval', { exact: true }),
        ).toBeVisible();
        bff.newSyntheticRequest();
        await recheck.click();
        await expect(reject).toBeVisible();
        await guide.action('open-rejection', reject, () => reject.click());
        await page.setViewportSize({ width: 320, height: 740 });
        await expect(dialog).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Confirm rejection prerequisite' }),
        ).toBeFocused();
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
        await guide.result('narrow-confirmation', dialog);
        await acknowledge.check();
        const recordRejection = page.getByRole('button', {
          name: 'Record rejection',
          exact: true,
        });
        await guide.action('record-rejection', recordRejection, () =>
          recordRejection.click(),
        );
        await expect(
          page.getByRole('heading', {
            name: 'Human decision recorded · REJECTED',
          }),
        ).toBeVisible();
        await expect(inspect).toBeVisible();
        await guide.action('inspect-final', inspect, () => inspect.click());
        await expect(card.getByText(/Human response: REJECTED/)).toBeVisible();
        await expect(reject).toHaveCount(0);
        await expect(
          runPane.getByText('Waiting for approval', { exact: true }),
        ).toBeVisible();
        expect(bff.effects()).toBe(2);
        expect(bff.commands()).toHaveLength(4);
        expect(bff.csrfReads()).toBe(4);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      },
    ),
);
