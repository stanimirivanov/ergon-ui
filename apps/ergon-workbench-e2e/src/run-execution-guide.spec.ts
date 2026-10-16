import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { runGuideScenario } from './guide/user-guide-session';
import { runExecutionGuide } from './guide/run-execution-guide';
import { installSimulatedRunExecutionBff } from './guide/simulated-run-execution-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'confirms pinned execution, rechecks status without dispatch and explicitly repairs one reservation',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runExecutionGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunExecutionBff(page);
        await page.goto(supervisorTenantPath);
        const assigned = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-assigned', assigned, () => assigned.click());
        expect(bff.reviewReads()).toBe(0);
        expect(bff.dispatches()).toBe(0);
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .click();
        const review = page.getByRole('button', {
          name: 'Review execution or recovery',
          exact: true,
        });
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Review pinned capability execution',
          exact: true,
        });
        const cancel = dialog.getByRole('button', {
          name: 'Cancel execution review',
          exact: true,
        });
        const submit = dialog.getByRole('button', {
          name: 'Authorize and execute pinned action',
          exact: true,
        });
        const resume = dialog.getByRole('button', {
          name: 'Confirm new recovery attempt',
          exact: true,
        });
        const ack = dialog.getByRole('checkbox');
        const policy = page.getByText('synthetic-execution-policy', {
          exact: true,
        });
        await expect(review).toBeVisible();
        await expect(page.getByText(/Human response: APPROVED/)).toBeVisible();
        await guide.result('inspect-approved-run', heading);
        await review.click();
        await expect(dialog).toContainText('Browser execution is disabled');
        await expect(submit).toHaveCount(0);
        expect(bff.intents()).toHaveLength(0);
        await guide.result('disabled-review', dialog);
        await cancel.click();
        bff.setEnabled(true);
        await review.click();
        await expect(submit).toBeVisible();
        expect(bff.reviewReads()).toBe(2);
        await guide.result('enabled-fresh-review', dialog);
        await submit.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Acknowledge the external effect',
        );
        expect(bff.intents()).toHaveLength(0);
        await guide.result('require-acknowledgement', dialog);
        await cancel.click();
        await expect(review).toBeFocused();
        expect(bff.intents()).toHaveLength(0);
        await guide.result('cancel-without-effect', review);
        await page.setViewportSize({ width: 320, height: 800 });
        await review.click();
        await expect(submit).toBeVisible();
        await expect(
          dialog.getByRole('heading', {
            name: 'Review pinned capability execution',
            exact: true,
          }),
        ).toBeFocused();
        for (let index = 0; index < 8; index += 1) {
          await page.keyboard.press('Tab');
          await expect
            .poll(() =>
              dialog.evaluate((element) =>
                element.contains(document.activeElement),
              ),
            )
            .toBe(true);
        }
        await heading.evaluate((element) => element.focus());
        await expect(heading).not.toBeFocused();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true);
        expect(
          (await new AxeBuilder({ page }).include('dialog').analyze())
            .violations,
        ).toEqual([]);
        await guide.result('keyboard-narrow-review', dialog);
        await page.keyboard.press('Escape');
        await expect(review).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await review.click();
        await expect(submit).toBeVisible();
        await ack.check();
        bff.setNext('conflict');
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Execution acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.dispatches()).toBe(0);
        await expect(dialog).toHaveCount(0);
        await guide.result('stale-confirmation', heading);
        await page
          .getByRole('button', {
            name: 'Recheck run before execution review',
            exact: true,
          })
          .click();
        await expect(review).toBeVisible();
        await guide.result('refresh-after-conflict', heading);
        await review.click();
        await expect(submit).toBeVisible();
        await ack.check();
        bff.setNext('lost');
        bff.holdCommand();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Execution acknowledgement pending…',
            exact: true,
          }),
        ).toBeVisible();
        await guide.result('confirm-action', heading);
        await expect(dialog).toHaveCount(0);
        await expect(heading).toBeFocused();
        await expect(policy).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await expect.poll(() => bff.intents().length).toBe(2);
        await guide.result('private-barrier', heading);
        bff.releaseCommand();
        const recheckCommand = page.getByRole('button', {
          name: 'Retry exact execution intent',
          exact: true,
        });
        await expect(recheckCommand).toBeVisible();
        await expect(
          page.getByText(/If the previous request was never admitted/),
        ).toBeVisible();
        expect(bff.dispatches()).toBe(1);
        await guide.result('lost-acknowledgement', recheckCommand);
        await recheckCommand.click();
        await expect(
          page.getByRole('heading', {
            name: 'Execution incomplete · external effect uncertain',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.intents()[2]).toEqual(bff.intents()[1]);
        expect(bff.dispatches()).toBe(1);
        await expect(review).toBeVisible();
        await guide.result('status-only-recheck', heading);
        await review.click();
        await expect(resume).toBeVisible();
        await expect(dialog).toContainText('not a status recheck');
        await guide.result('fresh-recovery-review', dialog);
        await ack.check();
        bff.setNext('receipt');
        await resume.click();
        await expect(
          page.getByRole('heading', {
            name: 'Receipt recorded · run projection incomplete',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.intents()[3]?.kind).toBe('resume');
        expect(bff.intents()[3]?.commandId).toBe(bff.intents()[1]?.commandId);
        expect(bff.intents()[3]?.attemptId).not.toBe(
          bff.intents()[1]?.attemptId,
        );
        expect(bff.dispatches()).toBe(2);
        await guide.result('confirm-recovery', heading);
        await expect(review).toBeVisible();
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toBeVisible();
        await guide.result('receipt-not-projection', heading);
        await review.click();
        await expect(resume).toBeVisible();
        await ack.check();
        bff.setNext('completed');
        await resume.click();
        await expect(
          page.getByRole('heading', {
            name: 'Execution result recorded · not outcome proof',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.dispatches()).toBe(2);
        expect(bff.intents()[4]?.commandId).toBe(bff.intents()[1]?.commandId);
        await guide.result('review-projection-repair', heading);
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole('group', { name: 'Run execution', exact: true })
            .getByText('Verifying', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: 'Accept proof and resolve case',
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(review).toHaveCount(0);
        await guide.result('verify-not-close', heading);
        bff.holdRead();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: 'Rechecking run access…',
            exact: true,
          }),
        ).toBeVisible();
        await guide.result('pending-revalidation', heading);
        bff.denyReads();
        bff.releaseRead();
        await expect(
          page.getByRole('heading', {
            name: 'Run context is unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toHaveCount(0);
        expect(bff.dispatches()).toBe(2);
        await guide.result('denied-revalidation', heading);
      },
    );
  },
);

test('missing execution support and denied review withdraw earlier private context without a command', async ({
  page,
}) => {
  const bff = await installSimulatedRunExecutionBff(page);
  bff.setSupported(false);
  await page.goto(`${supervisorTenantPath}?view=runs`);
  await page
    .getByRole('button', { name: `Inspect run ${assignedRunId}` })
    .click();
  const review = page.getByRole('button', {
    name: 'Review execution or recovery',
    exact: true,
  });
  await review.click();
  await expect(
    page.getByRole('heading', {
      name: 'Execution review unavailable',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(bff.intents()).toHaveLength(0);
  bff.setSupported(true);
  bff.setEnabled(true);
  await page
    .getByRole('button', {
      name: 'Recheck run before execution review',
      exact: true,
    })
    .click();
  await expect(review).toBeVisible();
  bff.denyReview();
  await review.click();
  await expect(
    page.getByRole('heading', {
      name: 'Execution review unavailable',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Retry exact execution intent' }),
  ).toHaveCount(0);
  expect(bff.intents()).toHaveLength(0);
  expect(bff.dispatches()).toBe(0);
});
