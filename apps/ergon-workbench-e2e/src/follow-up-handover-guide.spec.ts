import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { followUpHandoverGuide } from './guide/follow-up-handover-guide';
import {
  handoverHistoryText,
  installSimulatedFollowUpHandoverBff,
  recipientActorId,
} from './guide/simulated-follow-up-handover-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'confirms direct handover, replays a lost acknowledgement and independently loads recipient history',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpHandoverGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpHandoverBff(page);
        const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';
        const trigger = page.getByRole('button', {
          name: 'Hand over follow-up',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Hand over owned follow-up',
        });
        const confirm = dialog.getByRole('button', {
          name: 'Confirm handover',
        });
        const recovery = page.getByRole('button', {
          name: 'Recheck my owned work',
          exact: true,
        });
        const openConsole = page.getByRole('button', {
          name: 'Open resolver console',
        });
        const attention = page.getByRole('heading', {
          name: 'Handover needs attention',
          exact: true,
        });
        const openForm = async () => {
          await openConsole.click();
          await trigger.click();
        };
        const fillForm = async () => {
          await dialog
            .getByRole('textbox', { name: 'Recipient actor UUID' })
            .fill(recipientActorId);
          await dialog.getByRole('checkbox').check();
        };

        await page.goto(tenantPath);
        await openForm();
        await guide.result(
          'handover-review',
          dialog.getByRole('heading', {
            name: 'Hand over owned follow-up',
            exact: true,
          }),
        );
        await confirm.click();
        await expect(
          dialog.getByText('Enter a complete internal actor UUID.'),
        ).toBeVisible();
        await expect(
          dialog.getByText('Acknowledge the ownership and access change.'),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(0);
        await guide.result(
          'handover-validation',
          dialog.getByText('Enter a complete internal actor UUID.'),
        );
        await fillForm();
        await guide.action(
          'handover-cancel',
          dialog.getByRole('button', { name: 'Keep my ownership' }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        expect(bff.commands()).toHaveLength(0);
        await trigger.click();
        await expect(dialog.getByRole('textbox')).toHaveValue('');
        await page.setViewportSize({ width: 320, height: 812 });
        const dialogHeading = dialog.getByRole('heading', {
          name: 'Hand over owned follow-up',
          exact: true,
        });
        await dialogHeading.focus();
        await page.keyboard.press('Home');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBe(0);
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        await guide.result('handover-narrow', dialogHeading);
        await page.keyboard.press('Tab');
        await expect(
          dialog.getByRole('button', { name: 'Cancel handover' }),
        ).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(
          dialog.getByRole('button', { name: 'Keep my ownership' }),
        ).toBeFocused();
        await trigger.evaluate((element) => element.focus());
        await expect(trigger).not.toBeFocused();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.setViewportSize({ width: 1440, height: 1000 });
        await fillForm();
        await confirm.click();
        await expect(attention).toBeVisible();
        await expect(
          page.getByText(
            'Direct follow-up handover is not enabled in this deployment.',
          ),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Retry exact handover' }),
        ).toHaveCount(0);
        await guide.result('handover-disabled', attention);
        await guide.action('handover-recheck', recovery, () =>
          recovery.click(),
        );
        await expect(openConsole).toBeVisible();
        bff.setMode('conflict');
        await openForm();
        await fillForm();
        await confirm.click();
        await expect(
          page.getByText(
            'The original claim, revision or command intent conflicts. Recheck owned work before another confirmation.',
          ),
        ).toBeVisible();
        await guide.result('handover-conflict', attention);
        await expect(
          page.getByRole('button', { name: 'Retry exact handover' }),
        ).toHaveCount(0);
        await recovery.click();
        await expect(openConsole).toBeVisible();
        bff.setMode('lost-response');
        await openForm();
        await fillForm();
        await confirm.click();
        const pending = page.getByRole('heading', {
          name: 'Handing over owned work…',
          exact: true,
        });
        await expect(pending).toBeVisible();
        await expect.poll(() => bff.commands().length).toBe(3);
        await guide.result('handover-pending', pending);
        bff.loseResponse();
        const retry = page.getByRole('button', {
          name: 'Retry exact handover',
          exact: true,
        });
        await expect(retry).toBeVisible();
        await guide.result('handover-uncertain', attention);
        await guide.action('handover-replay', retry, () => retry.click());
        const recorded = page.getByRole('heading', {
          name: 'Follow-up handover recorded',
          exact: true,
        });
        await expect(recorded).toBeVisible();
        expect(bff.commands()).toHaveLength(4);
        expect(bff.commands()[2]).toEqual(bff.commands()[3]);
        expect(
          new Set(bff.commands().map((command) => command.commandId)).size,
        ).toBe(3);
        await expect(
          page.getByText(/Historical acknowledgement: ownership revision 3/),
        ).toBeVisible();
        await expect(trigger).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Internal notes', exact: true }),
        ).toHaveCount(0);
        await guide.result('handover-receipt', recorded);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await recovery.click();
        const empty = page.getByRole('heading', {
          name: 'No active claimed work in this view.',
          exact: true,
        });
        await expect(empty).toBeVisible();
        await expect(openConsole).toHaveCount(0);
        await guide.result('handover-former-owner', empty);
        bff.viewAsRecipient();
        await page.goto(tenantPath);
        await openConsole.click();
        await expect(trigger).toBeVisible();
        const presence = page.getByRole('region', {
          name: 'Current claim',
          exact: true,
        });
        await expect(presence.getByText('3', { exact: true })).toBeVisible();
        await guide.result('handover-recipient', presence);
        await page
          .getByRole('button', { name: 'Internal notes', exact: true })
          .click();
        const notes = page.getByRole('dialog', {
          name: 'Internal follow-up notes',
        });
        await expect(notes.getByText(handoverHistoryText)).toBeVisible();
        await expect(
          notes.getByText('741bcdba-9521-4e96-bfcc-7a5a2830eec8', {
            exact: true,
          }),
        ).toBeVisible();
        await guide.result(
          'handover-notes',
          notes.getByRole('region', { name: 'Recorded internal notes' }),
        );
        expect(bff.commands()).toHaveLength(4);
      },
    ),
);
