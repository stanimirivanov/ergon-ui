import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { questionRecordingGuide } from './guide/question-recording-guide';
import { installSimulatedQuestionRecordingBff } from './guide/simulated-question-recording-bff';
import { historicalQuestion } from './guide/simulated-follow-up-questions-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'records only confirmed question intent, explicitly recovers lost acknowledgement and withdraws conflicting access',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      questionRecordingGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedQuestionRecordingBff(page);
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
        await page
          .getByRole('button', { name: 'Open resolver console' })
          .click();
        const trigger = page.getByRole('button', {
          name: 'Requester questions',
          exact: true,
        });
        await trigger.click();
        const dialog = page.getByRole('dialog', {
          name: 'Requester question history',
        });
        const form = dialog.getByRole('region', {
          name: 'Record requester question',
          exact: true,
        });
        const field = form.getByRole('textbox', {
          name: 'Question for the requester',
        });
        const submit = form.getByRole('button', {
          name: 'Record requester question',
          exact: true,
        });
        await expect(field).toBeVisible();
        await field.fill(' \u00a0');
        await submit.click();
        const invalid = form.getByText(/^Enter nonblank text/);
        await expect(invalid).toBeVisible();
        expect(bff.commands()).toHaveLength(0);
        await guide.result('question-invalid', invalid);
        const exact =
          '  Which workspace did you use? <script>inert request</script> 😀\n';
        await field.fill(exact);
        await submit.click();
        const acknowledgement = form.getByText(
          'Confirm the requester and recording limits before continuing.',
        );
        await expect(acknowledgement).toBeVisible();
        expect(bff.commands()).toHaveLength(0);
        await guide.result('question-confirmation', acknowledgement);
        await form.getByRole('checkbox').check();
        await submit.click();
        const retry = dialog.getByRole('button', {
          name: 'Retry exact question',
        });
        await expect(retry).toBeVisible();
        expect(bff.commands()).toHaveLength(1);
        await expect(dialog.getByText(historicalQuestion.question)).toHaveCount(
          0,
        );
        await expect(field).toHaveCount(0);
        const uncertain = dialog
          .getByRole('status')
          .filter({ hasText: 'The recording outcome is uncertain.' });
        await guide.result('question-uncertain', uncertain);
        await guide.action('question-retry', retry, () => retry.click());
        const recorded = dialog
          .getByRole('status')
          .filter({ hasText: /^Question recorded/ });
        await expect(recorded).toBeVisible();
        await expect(form).toBeVisible();
        await expect(
          dialog
            .getByRole('region', { name: 'Recorded requester questions' })
            .getByText(exact.trim(), { exact: true }),
        ).toBeVisible();
        expect(bff.commands()).toHaveLength(2);
        expect(bff.commands()[1]).toEqual(bff.commands()[0]);
        expect(bff.commands()[0]?.question).toBe(exact);
        expect(await dialog.locator('script').count()).toBe(0);
        await guide.result('question-recorded', recorded);
        await field.fill('Discard this unsubmitted draft');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await guide.result('question-closed', trigger);
        await page.setViewportSize({ width: 320, height: 812 });
        await trigger.click();
        await expect(field).toHaveValue('');
        await expect(form.getByRole('checkbox')).not.toBeChecked();
        await field.focus();
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result('question-narrow', field);
        bff.conflict();
        await field.fill('A newly reviewed question');
        await form.getByRole('checkbox').check();
        await submit.click();
        const withdrawn = page.getByRole('heading', {
          name: 'Owner-scoped context withdrawn',
        });
        await expect(withdrawn).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: 'Restore access to the customer workspace',
            exact: true,
          }),
        ).toHaveCount(0);
        expect(bff.commands()).toHaveLength(3);
        await guide.result('question-conflict', withdrawn);
      },
    ),
);
