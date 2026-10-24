import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { followUpPriorityGuide } from './guide/follow-up-priority-guide';
import { installSimulatedFollowUpPriorityBff } from './guide/simulated-follow-up-priority-bff';
import { ownedContextScenario } from './guide/simulated-owned-context-bff';
import { runGuideScenario } from './guide/user-guide-session';

test('retires uncertain priority replay when original active ownership disappears', async ({
  page,
}) => {
  const bff = await installSimulatedFollowUpPriorityBff(page);
  bff.setMode('lost-response');
  await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await page
    .getByRole('button', { name: 'Change priority', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New priority').selectOption('HIGH');
  await dialog.getByRole('checkbox').check();
  await dialog
    .getByRole('button', { name: 'Confirm priority assignment' })
    .click();
  await expect.poll(() => bff.commands().length).toBe(1);
  bff.loseResponse();
  const replay = page.getByRole('button', {
    name: 'Retry exact priority assignment',
  });
  await expect(replay).toBeVisible();
  bff.withdrawOwnership();
  await replay.click();
  await expect(
    page.getByText(/The original active claim is unavailable/),
  ).toBeVisible();
  await expect(replay).toHaveCount(0);
  expect(bff.commands()).toHaveLength(1);
  await expect(
    page.getByText(ownedContextScenario.summary.case.goal, { exact: true }),
  ).toHaveCount(0);
});

test(
  'confirms independent priority and recovers history rather than current metadata',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpPriorityGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpPriorityBff(page);
        const openConsole = page.getByRole('button', {
          name: 'Open resolver console',
        });
        const trigger = page.getByRole('button', {
          name: 'Change priority',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Change owned follow-up priority',
        });
        const confirm = dialog.getByRole('button', {
          name: 'Confirm priority assignment',
        });
        const recover = page.getByRole('button', {
          name: 'Recheck my owned work',
          exact: true,
        });
        const feedback = page.getByRole('region', {
          name: 'Priority assignment needs attention',
        });
        const goal = page.getByText(ownedContextScenario.summary.case.goal, {
          exact: true,
        });
        const openForm = async () => {
          await openConsole.click();
          await goal.waitFor();
          await trigger.click();
        };
        const acknowledge = async () => {
          await dialog.getByLabel('New priority').selectOption('HIGH');
          await dialog.getByRole('checkbox').check();
        };
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
        await openForm();
        await expect(
          dialog.getByText('NORMAL · revision 0', { exact: true }),
        ).toBeVisible();
        await guide.result('priority-review', dialog);
        await confirm.click();
        const validation = dialog.getByText(
          'Acknowledge this priority assignment.',
          { exact: true },
        );
        await expect(validation).toBeVisible();
        expect(bff.commands()).toHaveLength(0);
        await guide.result('priority-validation', validation);
        await guide.action(
          'priority-cancel',
          dialog.getByRole('button', { name: 'Keep current priority' }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(bff.commands()).toHaveLength(0);
        await trigger.click();
        await expect(dialog.getByRole('checkbox')).not.toBeChecked();
        await page.setViewportSize({ width: 320, height: 812 });
        await dialog.getByRole('heading').focus();
        await page.keyboard.press('Tab');
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        // Keep the actual 320x812 checks above; give the recording caption room
        // outside the long modal so it does not cover the secondary decision.
        await page.setViewportSize({ width: 320, height: 1100 });
        await guide.result('priority-narrow', dialog);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await acknowledge();
        await confirm.click();
        await expect(feedback).toBeVisible();
        await expect(
          page.getByText(
            'Priority assignments are not enabled in this deployment.',
          ),
        ).toBeVisible();
        await expect(goal).toHaveCount(0);
        await guide.result('priority-disabled', feedback);
        await recover.click();
        bff.setMode('conflict');
        await openForm();
        await acknowledge();
        await confirm.click();
        await expect(
          page.getByText(
            /Ownership, priority revision or original intent changed/,
          ),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Retry exact priority assignment' }),
        ).toHaveCount(0);
        await guide.result('priority-conflict', feedback);
        await recover.click();
        bff.setMode('lost-response');
        await openForm();
        await acknowledge();
        await confirm.click();
        const pending = page.getByRole('region', {
          name: 'Assigning follow-up priority…',
        });
        await expect(pending).toBeVisible();
        await expect.poll(() => bff.commands().length).toBe(3);
        await expect(goal).toHaveCount(0);
        await guide.result('priority-pending', pending);
        bff.loseResponse();
        const replay = page.getByRole('button', {
          name: 'Retry exact priority assignment',
          exact: true,
        });
        await expect(replay).toBeVisible();
        expect(bff.commands()).toHaveLength(3);
        await guide.result('priority-uncertain', feedback);
        await replay.click();
        const history = page.getByRole('region', {
          name: 'Priority assignment recorded',
        });
        await expect(
          history.getByText(
            /Historical acknowledgement: HIGH at priority revision 1/,
          ),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(4);
        expect(bff.commands()[3]).toEqual(bff.commands()[2]);
        await expect(goal).toHaveCount(0);
        await guide.result('priority-history', history);
        await recover.click();
        await openConsole.click();
        await expect(goal).toBeVisible();
        const claim = page.getByRole('region', { name: 'Current claim' });
        await expect(
          claim.getByText('Priority URGENT', { exact: false }),
        ).toBeVisible();
        await expect(
          claim.getByText('revision 2', { exact: true }),
        ).toBeVisible();
        await expect(history).toHaveCount(0);
        await guide.result('priority-current', claim);
      },
    ),
);
