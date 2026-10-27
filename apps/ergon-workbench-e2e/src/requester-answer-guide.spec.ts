import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { requesterAnswerGuide } from './guide/requester-answer-guide';
import {
  installSimulatedRequesterAnswerBff,
  requesterAnswerCoordinates,
  requesterAnswerText,
} from './guide/simulated-requester-answer-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'records requester answers with exact recovery and independently fresh history',
  { tag: '@user-guide' },
  async ({ browser }) =>
    runGuideScenario(
      browser,
      'http://localhost:4301',
      requesterAnswerGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRequesterAnswerBff(page);
        const { tenantId, caseId } = requesterAnswerCoordinates;
        await page.goto(`/tenants/${tenantId}/cases/${caseId}`);
        await page
          .getByRole('button', {
            name: 'Answer question: Which browser did you use?',
          })
          .click();
        const field = page.getByRole('textbox', { name: 'Your answer' });
        await expect(field).toBeFocused();
        const form = page.getByRole('region', { name: 'Answer this question' });
        await guide.result('answer-select', form);
        await page.getByRole('button', { name: 'Record final answer' }).click();
        await expect(page.getByText(/Enter nonblank text/)).toBeVisible();
        expect(bff.csrfReads()).toBe(0);
        expect(bff.posts()).toBe(0);
        await guide.result('answer-invalid', form);
        await page.setViewportSize({ width: 320, height: 800 });
        await field.fill(requesterAnswerText);
        await page.getByRole('checkbox').check();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        // Keep the fixed simulation badge above the form heading, without
        // changing production layout or holding a network request for capture.
        await form.evaluate((element) =>
          window.scrollTo(
            0,
            window.scrollY + element.getBoundingClientRect().top - 64,
          ),
        );
        await expect(form).toBeInViewport({ ratio: 1 });
        await guide.result('answer-narrow', form);
        await page.setViewportSize({ width: 1440, height: 900 });
        const recordButton = page.getByRole('button', {
          name: 'Record final answer',
        });
        await guide.action('answer-pending', recordButton, () =>
          recordButton.click(),
        );
        const heading = page.getByRole('heading', {
          name: 'Case progress',
          exact: true,
        });
        await expect(heading).toBeFocused();
        await expect(
          page.getByText('Restore team workspace access', { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('complementary', { name: 'Request details' }),
        ).toHaveCount(0);
        await expect(page.locator('time')).toHaveCount(0);
        const result = page.getByRole('region', {
          name: 'Answer recording result',
        });
        await expect(result).toContainText('outcome is uncertain');
        expect(bff.posts()).toBe(1);
        await guide.result('answer-uncertain', result);
        await page.getByRole('button', { name: 'Recheck progress' }).click();
        const recorded = page.getByRole('region', { name: 'Recorded answer' });
        await expect(recorded).toContainText(requesterAnswerText.trim());
        expect(bff.historyReads()).toBe(2);
        await expect(
          page.getByRole('button', { name: /Answer question:/ }),
        ).toHaveCount(0);
        await guide.result('answer-rechecked', recorded);
        const retryButton = page.getByRole('button', {
          name: 'Retry exact answer',
        });
        await guide.action('answer-acknowledged', retryButton, async () => {
          await retryButton.click();
          await expect.poll(() => bff.historyReads()).toBe(3);
          await expect(
            page.getByText(/Answer recording acknowledged/),
          ).toBeVisible();
          await expect(recorded).toHaveCount(0);
          await expect(
            page.getByText('Restore team workspace access', { exact: true }),
          ).toHaveCount(0);
          expect(bff.posts()).toBe(2);
          expect(bff.csrfReads()).toBe(2);
          bff.releaseHistory();
        });
        await expect(recorded).toContainText(requesterAnswerText.trim());
        await expect(recorded.locator('script')).toHaveCount(0);
        await expect(recorded.locator('time').first()).toHaveAttribute(
          'datetime',
          '2026-10-27T09:01:00.123456789Z',
        );
        await guide.result('answer-recorded', recorded);
        bff.closeOnNextCommand();
        await page
          .getByRole('button', { name: 'Answer question: Which workspace?' })
          .click();
        await field.fill(requesterAnswerText);
        await page.getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Record final answer' }).click();
        await expect(result).toContainText(
          'Answer recording access is unavailable.',
        );
        await expect(recorded).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Retry exact answer' }),
        ).toHaveCount(0);
        await guide.result('answer-denied', result);
        await page.getByRole('button', { name: 'Recheck progress' }).click();
        await expect(
          page.getByText('Verified resolved', { exact: true }),
        ).toBeVisible();
        await expect(recorded).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Answer question:/ }),
        ).toHaveCount(0);
        expect(bff.posts()).toBe(3);
        expect(bff.csrfReads()).toBe(3);
        expect(bff.historyReads()).toBe(4);
        expect(
          await page.evaluate(
            () => localStorage.length + sessionStorage.length,
          ),
        ).toBe(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await guide.result(
          'answer-closed',
          page.getByText(
            'This case is closed. Its recorded history remains readable.',
          ),
        );
      },
    ),
);
