import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runHandoverGuide } from './guide/run-handover-guide';
import {
  handoverRecipients,
  handoverRunId,
  handoverTenantPath,
  installSimulatedRunHandoverBff,
} from './guide/simulated-run-handover-bff';
import { runGuideScenario } from './guide/user-guide-session';
import { fulfillSimulatedBff } from './guide/simulated-bff-response';

test('withdraws the prior run snapshot after recipient access is denied without sending a command', async ({
  page,
}) => {
  const bff = await installSimulatedRunHandoverBff(page);
  bff.enable();
  await page.route('**/handover-candidates?*', (route) =>
    fulfillSimulatedBff(
      route,
      { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
      404,
    ),
  );
  await page.goto(`${handoverTenantPath}?view=runs`);
  await page
    .getByRole('button', { name: `Inspect run ${handoverRunId}` })
    .click();
  const runIdentity = page.getByText(`Run ${handoverRunId}`, { exact: true });
  await expect(runIdentity).toBeVisible();
  await page
    .getByRole('button', { name: 'Hand over supervision', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Recipient access unavailable' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(runIdentity).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: `Inspect run ${handoverRunId}` }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Resolution run', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Retry exact handover' }),
  ).toHaveCount(0);
  expect(bff.requests()).toHaveLength(0);
  expect(bff.csrfReads()).toBe(0);
});

test(
  'confirms supervisor handover and recovers stale and uncertain intents without repeating a transfer',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runHandoverGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunHandoverBff(page);
        await page.goto(handoverTenantPath);
        const navigate = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-work', navigate, () => navigate.click());
        const inspect = page.getByRole('button', {
          name: `Inspect run ${handoverRunId}`,
        });
        await expect(inspect).toBeVisible();
        await guide.action('open-disabled-run', inspect, () => inspect.click());
        const openHandover = page.getByRole('button', {
          name: 'Hand over supervision',
          exact: true,
        });
        await expect(openHandover).toBeDisabled();
        expect(bff.requests()).toHaveLength(0);
        expect(bff.csrfReads()).toBe(0);
        await guide.result('disabled-boundary', openHandover);

        bff.enable();
        await page.reload();
        await expect(inspect).toBeVisible();
        await guide.action('open-enabled-run', inspect, () => inspect.click());
        await expect(openHandover).toBeEnabled();
        await guide.action('open-recipient-dialog', openHandover, () =>
          openHandover.click(),
        );
        const dialog = page.getByRole('dialog', {
          name: 'Hand over supervision',
        });
        const title = dialog.getByRole('heading', {
          name: 'Hand over supervision',
          exact: true,
        });
        const select = dialog.getByRole('combobox', {
          name: 'Eligible recipient',
        });
        const acknowledge = dialog.getByRole('checkbox', {
          name: 'I understand that my supervision access will be transferred to the selected resolver.',
        });
        const confirm = dialog.getByRole('button', {
          name: 'Confirm handover',
        });
        const cancel = dialog.getByRole('button', { name: 'Cancel handover' });
        const next = dialog.getByRole('button', {
          name: 'Next recipient page',
        });
        await expect(select).toBeVisible();
        await expect(title).toBeFocused();
        await page
          .getByRole('heading', {
            name: 'Resolution run',
            exact: true,
            includeHidden: true,
          })
          .evaluate((element) => element.focus());
        await expect(title).toBeFocused();
        await guide.action('require-confirmation', confirm, () =>
          confirm.click(),
        );
        await expect(
          dialog.getByText('Choose an eligible recipient.'),
        ).toBeVisible();
        await expect(
          dialog.getByText(
            'Confirm that your supervision access will be transferred.',
          ),
        ).toBeVisible();
        expect(bff.requests()).toHaveLength(0);
        await guide.action('next-recipient-page', next, () => next.click());
        const last = handoverRecipients.at(-1);
        const first = handoverRecipients[0];
        if (last === undefined || first === undefined)
          throw new Error('Recipient fixture must be populated');
        await expect(
          select.getByRole('option', { name: `Resolver ${last}` }),
        ).toBeAttached();
        await guide.action('choose-cancelled-recipient', select, () =>
          select.selectOption(last).then(() => undefined),
        );
        await guide.action('cancel-handover', cancel, () => cancel.click());
        await expect(dialog).not.toBeVisible();
        await expect(openHandover).toBeFocused();
        const readsBeforeReopen = bff.candidateReads();
        await guide.action('reopen-recipients', openHandover, () =>
          openHandover.click(),
        );
        await expect(select).toBeVisible();
        await expect.poll(bff.candidateReads).toBe(readsBeforeReopen + 1);
        await expect(select).toHaveValue('');
        await guide.action('prepare-stale-intent', select, async () => {
          await select.selectOption(first);
          await acknowledge.check();
        });
        bff.advanceEpoch();
        await guide.action('submit-stale-intent', confirm, () =>
          confirm.click(),
        );
        await expect(
          page.getByRole('heading', { name: 'Handover result unavailable' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Retry exact handover' }),
        ).toHaveCount(0);
        await expect(
          page.getByText('synthetic-handover-policy', { exact: true }),
        ).toHaveCount(0);
        const recover = page.getByRole('button', {
          name: 'Recheck run before choosing again',
        });
        expect(bff.requests()).toHaveLength(1);
        await guide.result('inspect-stale-recovery', recover);
        await guide.action('recover-current-run', recover, () =>
          recover.click(),
        );
        await expect(openHandover).toBeEnabled();
        await guide.action('reopen-current-handover', openHandover, () =>
          openHandover.click(),
        );
        await expect(
          dialog.getByText('You are transferring supervision revision 2.', {
            exact: false,
          }),
        ).toBeVisible();
        await expect(select).toBeVisible();
        await guide.action('prepare-current-intent', select, async () => {
          await select.selectOption(first);
          await acknowledge.check();
        });
        bff.holdLostResponse();
        await guide.action('send-held-command', confirm, () => confirm.click());
        await expect.poll(() => bff.requests().length).toBe(2);
        const pending = page.getByRole('heading', {
          name: 'Transferring supervision…',
        });
        await expect(pending).toBeVisible();
        await expect(dialog).not.toBeVisible();
        await expect(
          page.getByRole('list', { name: 'Active assigned runs' }),
        ).toHaveCount(0);
        await expect(
          page.getByText('synthetic-handover-policy', { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Resolution run', exact: true }),
        ).toBeFocused();
        await guide.result('inspect-pending-transfer', pending);
        bff.releaseLostResponse();
        const replay = page.getByRole('button', {
          name: 'Retry exact handover',
        });
        await expect(replay).toBeVisible();
        expect(bff.requests()).toHaveLength(2);
        await guide.result('inspect-uncertain-result', replay);
        await guide.action('replay-exact-command', replay, () =>
          replay.click(),
        );
        const success = page.getByRole('heading', {
          name: 'Supervision handover recorded',
        });
        await expect(success).toBeVisible();
        await expect(
          page.getByRole('heading', {
            name: 'No active assigned runs',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.requests()).toHaveLength(3);
        expect(bff.requests()[2]).toEqual(bff.requests()[1]);
        expect(bff.csrfReads()).toBe(3);
        await guide.result('inspect-recorded-handover', success);

        bff.becomeRecipient();
        await page.reload();
        await expect(inspect).toBeVisible();
        await guide.result('inspect-recipient-session', inspect);
        await guide.action('inspect-recipient-run', inspect, () =>
          inspect.click(),
        );
        await expect(openHandover).toBeEnabled();
        await page.setViewportSize({ width: 320, height: 740 });
        await guide.action('inspect-narrow-handover', openHandover, () =>
          openHandover.click(),
        );
        await expect(select).toBeVisible();
        await expect(
          dialog.getByText('You are transferring supervision revision 3.', {
            exact: false,
          }),
        ).toBeVisible();
        for (let index = 0; index < 8; index++) {
          await page.keyboard.press('Tab');
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document.activeElement !== null &&
                  document.activeElement.closest('dialog') !== null,
              ),
            )
            .toBe(true);
        }
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.action('finish-without-second-transfer', cancel, () =>
          cancel.click(),
        );
        await expect(dialog).not.toBeVisible();
        await expect(openHandover).toBeFocused();
        expect(bff.requests()).toHaveLength(3);
      },
    ),
);
