import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { followUpQuestionsGuide } from './guide/follow-up-questions-guide';
import {
  historicalQuestion,
  recordedAnswer,
  installSimulatedFollowUpQuestionsBff,
} from './guide/simulated-follow-up-questions-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'inspects bounded requester questions and withdraws failed private access',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      followUpQuestionsGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedFollowUpQuestionsBff(page);
        await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
        await page
          .getByRole('button', { name: 'Open resolver console' })
          .click();
        const caseHeading = page.getByRole('heading', {
          name: 'Restore access to the customer workspace',
          exact: true,
        });
        await expect(caseHeading).toBeVisible();
        const trigger = page.getByRole('button', {
          name: 'Requester questions',
          exact: true,
        });
        await expect(trigger).toBeVisible();
        expect(bff.reads()).toBe(0);
        await trigger.click();
        const dialog = page.getByRole('dialog', {
          name: 'Requester question history',
        });
        await expect(
          dialog.getByText(historicalQuestion.question),
        ).toBeVisible();
        expect(await dialog.locator('script').count()).toBe(0);
        await guide.result(
          'questions-history',
          dialog.getByRole('region', { name: 'Recorded requester questions' }),
        );
        await expect(
          dialog.getByText('Answer history is not supplied by this server.'),
        ).toBeVisible();
        bff.setMode('answered');
        await dialog
          .getByRole('button', { name: 'Recheck question access' })
          .click();
        const answer = dialog.getByRole('region', {
          name: 'Recorded requester answer',
        });
        await expect(answer).toContainText(recordedAnswer.answer.trim());
        await expect(answer.locator('time').first()).toHaveAttribute(
          'datetime',
          recordedAnswer.respondedAt,
        );
        expect(await answer.locator('script').count()).toBe(0);
        await guide.result('questions-answer', answer);
        const readsBeforeReopen = bff.reads();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.action(
          'questions-closed',
          dialog.getByRole('button', { name: 'Close requester questions' }),
          () => page.keyboard.press('Escape'),
        );
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(page.getByText(historicalQuestion.question)).toHaveCount(
          0,
        );
        await expect(answer).toHaveCount(0);
        await trigger.click();
        await expect(
          dialog.getByText(historicalQuestion.question),
        ).toBeVisible();
        await expect(answer).toBeVisible();
        expect(bff.reads()).toBe(readsBeforeReopen + 1);
        bff.setMode('temporary');
        await dialog
          .getByRole('button', { name: 'Recheck question access' })
          .click();
        const retry = dialog.getByRole('button', {
          name: 'Try questions again',
        });
        await expect(retry).toBeVisible();
        await expect(answer).toHaveCount(0);
        await expect(retry).toBeFocused();
        await expect(
          dialog.getByText('No retained questions are displayed.', {
            exact: false,
          }),
        ).toBeVisible();
        await expect(dialog).not.toContainText('case evidence');
        await expect(page.getByText(historicalQuestion.question)).toHaveCount(
          0,
        );
        await guide.result(
          'questions-temporary',
          dialog.getByText(/^Question history unavailable\./),
        );
        bff.setMode('empty');
        await retry.click();
        await expect(
          dialog.getByText('No requester questions recorded.'),
        ).toBeVisible();
        await guide.result(
          'questions-empty',
          dialog.getByRole('region', { name: 'Recorded requester questions' }),
        );
        bff.setMode('unanswered');
        await dialog
          .getByRole('button', { name: 'Recheck question access' })
          .click();
        const unanswered = dialog.getByText(
          'No answer recorded in this checked snapshot.',
        );
        await expect(unanswered).toBeVisible();
        await guide.result('questions-unanswered', unanswered);
        bff.setMode('truncated');
        await dialog
          .getByRole('button', { name: 'Recheck question access' })
          .click();
        const truncation = dialog.getByRole('note');
        await expect(truncation).toBeVisible();
        await guide.result('questions-truncated', truncation);
        await page.setViewportSize({ width: 320, height: 812 });
        const heading = dialog.getByRole('heading', {
          name: 'Requester question history',
          exact: true,
        });
        await heading.focus();
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        await guide.result('questions-narrow', heading);
        await page.keyboard.press('Escape');
        bff.setMode('denied');
        await trigger.click();
        const withdrawn = page.getByRole('heading', {
          name: 'Owner-scoped context withdrawn',
        });
        await expect(withdrawn).toBeVisible();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByText(historicalQuestion.question)).toHaveCount(
          0,
        );
        await expect(caseHeading).toHaveCount(0);
        await guide.result('questions-withdrawn', withdrawn);
      },
    ),
);
