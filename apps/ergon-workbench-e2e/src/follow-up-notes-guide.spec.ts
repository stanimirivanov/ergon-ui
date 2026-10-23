import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { followUpNotesGuide } from './guide/follow-up-notes-guide';
import {
  historicalNote,
  installSimulatedFollowUpNotesBff,
} from './guide/simulated-follow-up-notes-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'records internal commentary with exact replay and withdraws notes after lost access',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpNotesGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpNotesBff(page);
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
        await page
          .getByRole('button', { name: 'Open resolver console' })
          .click();
        const trigger = page.getByRole('button', {
          name: 'Internal notes',
          exact: true,
        });
        await expect(trigger).toBeVisible();
        expect(bff.reads()).toBe(0);
        await trigger.click();
        const dialog = page.getByRole('dialog', {
          name: 'Internal follow-up notes',
        });
        await expect(dialog.getByText(historicalNote.text)).toBeVisible();
        expect(await dialog.locator('script').count()).toBe(0);
        await guide.result(
          'notes-history',
          dialog.getByRole('region', { name: 'Recorded internal notes' }),
        );

        const exactText =
          '  Checked the SSO session; request a fresh diagnostic before proposing a change. 😀\n';
        const field = dialog.getByRole('textbox', {
          name: 'Internal note text',
        });
        await guide.action('notes-draft', field, () => field.fill(exactText));
        await dialog
          .getByRole('button', { name: 'Save internal note' })
          .click();
        const retry = dialog.getByRole('button', { name: 'Retry exact note' });
        await expect(retry).toBeVisible();
        expect(bff.commands()).toHaveLength(1);
        await guide.result(
          'notes-uncertain',
          dialog.getByRole('status').filter({ hasText: 'uncertain' }),
        );
        await guide.action('notes-replay', retry, () => retry.click());
        await expect(
          dialog.getByText(exactText, { exact: true }),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(2);
        expect(bff.commands()[0]).toEqual(bff.commands()[1]);
        await expect(dialog.getByRole('textbox')).toHaveValue('');
        await guide.result(
          'notes-recorded',
          dialog.getByRole('region', { name: 'Recorded internal notes' }),
        );
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );

        await guide.action(
          'notes-close',
          dialog.getByRole('button', { name: 'Close internal notes' }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(page.getByText(exactText, { exact: true })).toHaveCount(0);
        bff.truncate();
        await trigger.click();
        const truncation = dialog
          .getByRole('note')
          .filter({ hasText: 'latest 100' });
        await expect(truncation).toBeVisible();
        await guide.result('notes-truncated', truncation);
        await page.setViewportSize({ width: 320, height: 812 });
        await dialog
          .getByRole('heading', {
            name: 'Internal follow-up notes',
            exact: true,
          })
          .focus();
        await page.keyboard.press('Home');
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        await guide.result(
          'notes-narrow',
          dialog.getByRole('heading', {
            name: 'Internal follow-up notes',
            exact: true,
          }),
        );
        await page.keyboard.press('Tab');
        await expect(
          dialog.getByRole('button', { name: 'Close internal notes' }),
        ).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(
          dialog.getByRole('button', { name: 'Save internal note' }),
        ).toBeFocused();
        await trigger.evaluate((element) => element.focus());
        await expect(trigger).not.toBeFocused();
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        bff.deny();
        await trigger.click();
        const withdrawn = page.getByRole('heading', {
          name: 'Owner-scoped context withdrawn',
        });
        await expect(withdrawn).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByText(historicalNote.text)).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Back to active work' }),
        ).toBeFocused();
        await expect(
          page.getByText('The sign-in link returns an expired-token message.'),
        ).toHaveCount(0);
        await guide.result('notes-withdrawn', withdrawn.locator('..'));
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      },
    ),
);
