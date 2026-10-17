import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { runGuideScenario } from './guide/user-guide-session';
import { runRetryGuide } from './guide/run-retry-guide';
import {
  installSimulatedRunRetryBff,
  retryCurrentPolicy,
  retryOriginalPolicy,
  retrySuccessorId,
} from './guide/simulated-run-retry-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'confirms one fresh successor and recovers exact intent without inheriting execution authority',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runRetryGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunRetryBff(page);
        await page.goto(supervisorTenantPath);
        const assigned = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await guide.action('open-assigned', assigned, () => assigned.click());
        expect(bff.reviewReads()).toBe(0);
        expect(bff.intents()).toHaveLength(0);
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .click();
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        const review = page.getByRole('button', {
          name: 'Review fresh-run retry',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Review fresh-run retry',
          exact: true,
        });
        const cancel = dialog.getByRole('button', {
          name: 'Cancel retry review',
          exact: true,
        });
        const submit = dialog.getByRole('button', {
          name: 'Create fresh successor',
          exact: true,
        });
        const acknowledge = dialog.getByRole('checkbox');
        await expect(review).toBeVisible();
        await expect(
          page.getByText('Connector failed', { exact: true }),
        ).toBeVisible();
        await guide.result('inspect-failed', heading);
        await review.click();
        await expect(dialog.getByRole('status')).toContainText(
          'Browser failed-run retry is disabled',
        );
        await expect(submit).toHaveCount(0);
        expect(bff.intents()).toHaveLength(0);
        await guide.result('disabled-review', dialog);
        await cancel.click();
        bff.setEnabled(true);
        await review.click();
        await expect(submit).toBeVisible();
        await expect(dialog).toContainText(retryCurrentPolicy);
        expect(bff.reviewReads()).toBe(2);
        await guide.result('fresh-review', dialog);
        await submit.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Acknowledge the fresh-run boundary',
        );
        expect(bff.intents()).toHaveLength(0);
        await guide.result('acknowledgement', dialog);
        await cancel.click();
        await expect(review).toBeFocused();
        expect(bff.successorCreations()).toBe(0);
        await guide.result('cancel', review);
        await page.setViewportSize({ width: 320, height: 800 });
        await review.click();
        await expect(submit).toBeVisible();
        await expect(
          dialog.getByRole('heading', {
            name: 'Review fresh-run retry',
            exact: true,
          }),
        ).toBeFocused();
        for (const key of [
          'Tab',
          'Tab',
          'Tab',
          'Tab',
          'Shift+Tab',
          'Shift+Tab',
        ]) {
          await page.keyboard.press(key);
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
        await guide.result('keyboard-narrow', dialog);
        await page.keyboard.press('Escape');
        await expect(review).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await review.click();
        await expect(submit).toBeVisible();
        await acknowledge.check();
        bff.setNext('conflict');
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Retry acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: 'Retry exact successor intent',
            exact: true,
          }),
        ).toHaveCount(0);
        expect(bff.successorCreations()).toBe(0);
        await guide.result('stale-plan', heading);
        await page
          .getByRole('button', {
            name: 'Recheck run before retry review',
            exact: true,
          })
          .click();
        await expect(review).toBeVisible();
        await review.click();
        await expect(submit).toBeVisible();
        await expect(dialog.getByText('5', { exact: true })).toBeVisible();
        await guide.result('refresh', dialog);
        bff.setNext('lost-committed');
        bff.holdCommand();
        await acknowledge.check();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Fresh-run retry pending…',
            exact: true,
          }),
        ).toBeVisible();
        await expect.poll(() => bff.intents().length).toBe(2);
        await guide.result('confirm', heading);
        await expect(dialog).toHaveCount(0);
        await expect(heading).toBeFocused();
        await expect(
          page.getByText(retryOriginalPolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await guide.result('private-barrier', heading);
        bff.releaseCommand();
        await expect(
          page.getByRole('heading', {
            name: 'Retry acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(/If it never committed, this may first create/),
        ).toBeVisible();
        expect(bff.successorCreations()).toBe(1);
        await guide.result('uncertain', heading);
        await page
          .getByRole('button', {
            name: 'Retry exact successor intent',
            exact: true,
          })
          .click();
        await expect(
          page.getByRole('heading', {
            name: 'Fresh successor recorded · not executed',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.intents()).toHaveLength(3);
        expect(bff.intents()[2]).toEqual(bff.intents()[1]);
        expect(bff.successorCreations()).toBe(1);
        await guide.result('exact-replay', heading);
        await expect(
          page.getByText('Attempt 2', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(`Run ${retrySuccessorId}`, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('No terminal result recorded', { exact: true }),
        ).toBeVisible();
        await expect(page.getByText(/Human response: APPROVED/)).toHaveCount(0);
        await expect(
          page.getByText(retryCurrentPolicy, { exact: true }),
        ).toHaveCount(1);
        await guide.result('fresh-successor', heading);
        bff.holdNextRead();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(
          page.getByText(retryCurrentPolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(heading).toBeFocused();
        await guide.result('held-recheck', heading);
        bff.setReadAccess(false);
        bff.releaseRead();
        await expect(
          page.getByRole('heading', {
            name: 'Run context is unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(retryCurrentPolicy, { exact: true }),
        ).toHaveCount(0);
        await guide.result('denied', heading);
        bff.setReadAccess(true);
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(
          page.getByText('Attempt 2', { exact: true }),
        ).toBeVisible();
        expect(bff.intents()).toHaveLength(3);
        await guide.result('recover-access', heading);
        bff.failSuccessor();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(
          page.getByText('Connector failed', { exact: true }),
        ).toBeVisible();
        await expect(review).toBeVisible();
        await guide.result('second-failure', heading);
        await review.click();
        await expect(dialog.getByRole('status')).toContainText(
          'total-attempt limit is reached',
        );
        await expect(submit).toHaveCount(0);
        await guide.result('exhausted', dialog);
        await cancel.click();
        await page
          .getByRole('button', { name: 'Close run', exact: true })
          .click();
        await expect(
          page.getByRole('heading', {
            name: 'Select an assigned run',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.successorCreations()).toBe(1);
        expect(bff.intents()).toHaveLength(3);
        await guide.result('close', heading);
      },
    );
  },
);

type RetryFixture = Awaited<ReturnType<typeof installSimulatedRunRetryBff>>;
const reviewFailures: Record<string, (fixture: RetryFixture) => void> = {
  unsupported: (fixture) => fixture.setSupported(false),
  denied: (fixture) => fixture.denyReview(),
  malformed: (fixture) => fixture.malformedReview(),
};
for (const [mode, prepare] of Object.entries(reviewFailures)) {
  test(`withdraws private context on ${mode} retry review without creating intent`, async ({
    page,
  }) => {
    const bff = await installSimulatedRunRetryBff(page);
    bff.setEnabled(true);
    prepare(bff);
    await openFailedRun(page);
    await page
      .getByRole('button', { name: 'Review fresh-run retry', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Retry review unavailable',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText(retryOriginalPolicy, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', {
        name: 'Retry exact successor intent',
        exact: true,
      }),
    ).toHaveCount(0);
    expect(bff.intents()).toHaveLength(0);
    expect(bff.successorCreations()).toBe(0);
  });
}

test('exact retry can first commit original intent when the first POST never committed', async ({
  page,
}) => {
  const bff = await installSimulatedRunRetryBff(page);
  bff.setEnabled(true);
  bff.setNext('lost-uncommitted');
  await openFailedRun(page);
  await page
    .getByRole('button', { name: 'Review fresh-run retry', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Review fresh-run retry',
    exact: true,
  });
  await dialog.getByRole('checkbox').check();
  await dialog
    .getByRole('button', { name: 'Create fresh successor', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Retry exact successor intent',
      exact: true,
    }),
  ).toBeVisible();
  expect(bff.successorCreations()).toBe(0);
  expect(bff.intents()).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Retry exact successor intent', exact: true })
    .click();
  await expect(page.getByText('Attempt 2', { exact: true })).toBeVisible();
  expect(bff.successorCreations()).toBe(1);
  expect(bff.intents()).toHaveLength(2);
  expect(bff.intents()[1]).toEqual(bff.intents()[0]);
});

async function openFailedRun(page: Page): Promise<void> {
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: `Inspect run ${assignedRunId}` })
    .click();
  await expect(
    page.getByRole('button', { name: 'Review fresh-run retry', exact: true }),
  ).toBeVisible();
}
