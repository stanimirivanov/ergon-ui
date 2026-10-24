import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { followUpCompletionGuide } from './guide/follow-up-completion-guide';
import { installSimulatedFollowUpCompletionBff } from './guide/simulated-follow-up-completion-bff';
import { ownedContextScenario } from './guide/simulated-owned-context-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'confirms terminal administrative completion and recovers only the original historical acknowledgement',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpCompletionGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpCompletionBff(page);
        const openConsole = page.getByRole('button', {
          name: 'Open resolver console',
        });
        const trigger = page.getByRole('button', {
          name: 'Complete follow-up',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Complete owned follow-up',
        });
        const confirm = dialog.getByRole('button', {
          name: 'Confirm completion',
        });
        const recovery = page.getByRole('button', {
          name: 'Recheck my owned work',
          exact: true,
        });
        const attention = page.getByRole('heading', {
          name: 'Completion needs attention',
          exact: true,
        });
        const replay = page.getByRole('button', {
          name: 'Retry exact completion',
          exact: true,
        });
        const goal = page.getByText(ownedContextScenario.summary.case.goal, {
          exact: true,
        });
        const openForm = async () => {
          await openConsole.click();
          await trigger.click();
        };
        const acknowledge = async () => {
          await dialog.getByRole('checkbox').check();
        };
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
        await openForm();
        await expect(
          dialog.getByText(ownedContextScenario.claim.claimId, { exact: true }),
        ).toBeVisible();
        // Whole-message targets keep recording captions outside consequences,
        // failures and receipts rather than covering their text below a heading.
        await guide.result('completion-review', dialog);
        await confirm.click();
        await expect(
          dialog.getByText(
            'Acknowledge completion and loss of private access.',
          ),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(0);
        await guide.result(
          'completion-validation',
          dialog.getByText(
            'Acknowledge completion and loss of private access.',
          ),
        );
        await acknowledge();
        await guide.action(
          'completion-cancel',
          dialog.getByRole('button', { name: 'Keep follow-up active' }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(bff.commands()).toHaveLength(0);
        await trigger.click();
        await expect(dialog.getByRole('checkbox')).not.toBeChecked();
        await page.setViewportSize({ width: 320, height: 812 });
        await dialog
          .getByRole('heading', {
            name: 'Complete owned follow-up',
            exact: true,
          })
          .focus();
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.keyboard.press('Tab');
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
        await guide.result('completion-narrow', dialog);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await acknowledge();
        await confirm.click();
        await expect(attention).toBeVisible();
        await expect(replay).toHaveCount(0);
        await expect(goal).toHaveCount(0);
        expect(bff.commands()).toHaveLength(1);
        await guide.result('completion-disabled', attention.locator('..'));
        await recovery.click();
        await expect(openConsole).toBeVisible();
        await openConsole.click();
        await expect(goal).toBeVisible();
        await guide.result(
          'completion-recheck',
          page.getByRole('region', { name: 'Resolver Console', exact: true }),
        );
        bff.setMode('conflict');
        await trigger.click();
        await acknowledge();
        await confirm.click();
        await expect(attention).toBeVisible();
        await expect(replay).toHaveCount(0);
        await expect(goal).toHaveCount(0);
        expect(bff.commands()).toHaveLength(2);
        await guide.result('completion-conflict', attention.locator('..'));
        await recovery.click();
        await expect(openConsole).toBeVisible();
        bff.setMode('lost-response');
        await openForm();
        await acknowledge();
        await confirm.click();
        const pending = page.getByRole('heading', {
          name: 'Completing owned follow-up…',
          exact: true,
        });
        await expect(pending).toBeVisible();
        await expect.poll(() => bff.commands().length).toBe(3);
        await expect(goal).toHaveCount(0);
        await guide.result('completion-pending', pending.locator('..'));
        bff.loseResponse();
        await expect(replay).toBeVisible();
        await guide.result('completion-uncertain', attention.locator('..'));
        expect(bff.commands()).toHaveLength(3);
        await replay.click();
        const receipt = page.getByRole('heading', {
          name: 'Follow-up completion recorded',
          exact: true,
        });
        await expect(receipt).toBeVisible();
        expect(bff.commands()).toHaveLength(4);
        expect(bff.commands()[3]).toEqual(bff.commands()[2]);
        await expect(goal).toHaveCount(0);
        await expect(
          page.getByRole('region', { name: 'Current claim' }),
        ).toHaveCount(0);
        await guide.result('completion-receipt', receipt.locator('..'));
        await recovery.click();
        const empty = page.getByRole('heading', {
          name: 'No active claimed work in this view.',
          exact: true,
        });
        await expect(empty).toBeVisible();
        await expect(openConsole).toHaveCount(0);
        await expect(replay).toHaveCount(0);
        await expect(goal).toHaveCount(0);
        await guide.result('completion-retired', empty.locator('..'));
      },
    ),
);
