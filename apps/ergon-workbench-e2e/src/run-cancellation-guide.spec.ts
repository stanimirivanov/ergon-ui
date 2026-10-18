import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runCancellationGuide } from './guide/run-cancellation-guide';
import {
  cancellationPrivatePolicy,
  installSimulatedRunCancellationBff,
} from './guide/simulated-run-cancellation-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'cancels only untouched work and separates historical acknowledgement from current access and proof',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runCancellationGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunCancellationBff(page);
        await openRun(page);
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        const review = page.getByRole('button', {
          name: 'Review untouched-run cancellation',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Review untouched-run cancellation',
          exact: true,
        });
        const dismiss = dialog.getByRole('button', {
          name: 'Dismiss cancellation review',
          exact: true,
        });
        const submit = dialog.getByRole('button', {
          name: 'Cancel untouched run',
          exact: true,
        });
        const ack = dialog.getByRole('checkbox');
        expect(bff.reviews()).toBe(0);
        expect(bff.intents()).toHaveLength(0);
        await guide.result('inspect', heading);
        await review.click();
        await expect(dialog.getByRole('status')).toContainText(
          'Browser cancellation is disabled',
        );
        await expect(submit).toHaveCount(0);
        await guide.result('disabled', dialog);
        await dismiss.click();
        bff.setReview('eligible');
        await review.click();
        await expect(submit).toBeVisible();
        await expect(dialog).toContainText('0 / 0');
        expect(bff.reviews()).toBe(2);
        await guide.result('review', dialog);
        await submit.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Acknowledge the untouched-run cancellation boundary',
        );
        expect(bff.intents()).toHaveLength(0);
        await guide.result('acknowledge', dialog);
        await dismiss.click();
        await expect(review).toBeFocused();
        expect(bff.intents()).toHaveLength(0);
        await guide.result('dismiss', review);
        await page.setViewportSize({ width: 320, height: 800 });
        await review.click();
        await expect(submit).toBeVisible();
        await expect(
          dialog.getByRole('heading', {
            name: 'Review untouched-run cancellation',
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
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect(
          (await new AxeBuilder({ page }).include('dialog').analyze())
            .violations,
        ).toEqual([]);
        await guide.result('keyboard', dialog);
        await page.keyboard.press('Escape');
        await expect(review).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await review.click();
        await expect(submit).toBeVisible();
        bff.setNext('conflict');
        await ack.check();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Cancellation acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: 'Retry exact cancellation intent',
            exact: true,
          }),
        ).toHaveCount(0);
        expect(bff.cancellations()).toBe(0);
        await guide.result('conflict', heading);
        await page
          .getByRole('button', {
            name: 'Recheck run before cancellation review',
            exact: true,
          })
          .click();
        await expect(review).toBeVisible();
        await review.click();
        await expect(dialog).toContainText('1 / 0');
        await guide.result('refresh', dialog);
        bff.setNext('lost-committed');
        bff.holdCommand();
        await ack.check();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Untouched-run cancellation pending…',
            exact: true,
          }),
        ).toBeVisible();
        await expect.poll(() => bff.intents().length).toBe(2);
        await expect(dialog).toHaveCount(0);
        await expect(heading).toBeFocused();
        await expect(
          page.getByText(cancellationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await guide.result('pending', heading);
        bff.releaseCommand();
        const replay = page.getByRole('button', {
          name: 'Retry exact cancellation intent',
          exact: true,
        });
        await expect(replay).toBeVisible();
        expect(bff.cancellations()).toBe(1);
        await expect(
          page.getByText(/If it never committed, this may first cancel/),
        ).toBeVisible();
        await guide.result('uncertain', heading);
        await replay.click();
        const success = page.getByRole('heading', {
          name: 'Run cancellation recorded · case not closed',
          exact: true,
        });
        await expect(success).toBeVisible();
        expect(bff.intents()).toHaveLength(3);
        expect(bff.intents()[2]).toEqual(bff.intents()[1]);
        expect(bff.cancellations()).toBe(1);
        await guide.result('replay', success);
        const terminal = page
          .getByRole('group', { name: 'Run execution', exact: true })
          .getByText('Cancelled', { exact: true });
        await expect(terminal).toBeVisible();
        await expect(
          page.getByRole('heading', {
            name: '1 · Untouched-run cancellation recorded',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await expect(review).toHaveCount(0);
        await expect(
          page.getByText('Outcome not assessed', { exact: true }),
        ).toBeVisible();
        await guide.result(
          'terminal',
          page
            .getByRole('group', { name: 'Run outcome', exact: true })
            .getByText('Cancelled', { exact: true }),
        );
        bff.holdRead();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(terminal).toHaveCount(0);
        await expect(heading).toBeFocused();
        await guide.result('held', heading);
        bff.setReadAccess(false);
        bff.releaseRead();
        const denied = page.getByRole('heading', {
          name: 'Run context is unavailable',
          exact: true,
        });
        await expect(denied).toBeVisible();
        await expect(
          page.getByText(cancellationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        expect(bff.intents()).toHaveLength(3);
        await guide.result('denied', denied.locator('..'));
        bff.setReadAccess(true);
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(terminal).toBeVisible();
        expect(bff.cancellations()).toBe(1);
        expect(bff.intents()).toHaveLength(3);
        await guide.result('restore', terminal);
      },
    );
  },
);

for (const mode of [
  'unsupported',
  'denied',
  'stale',
  'authorization-recorded',
  'not-untouched',
] as const) {
  test(`does not create cancellation intent from ${mode} review`, async ({
    page,
  }) => {
    const bff = await installSimulatedRunCancellationBff(page);
    bff.setReview(mode);
    await openRun(page);
    await page
      .getByRole('button', {
        name: 'Review untouched-run cancellation',
        exact: true,
      })
      .click();
    if (mode === 'authorization-recorded')
      await expect(page.getByRole('dialog').getByRole('status')).toContainText(
        'Even an unconsumed grant prevents cancellation',
      );
    else {
      await expect(
        page.getByRole('heading', {
          name: 'Cancellation review unavailable',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(
      page.getByRole('button', { name: 'Cancel untouched run', exact: true }),
    ).toHaveCount(0);
    expect(bff.intents()).toHaveLength(0);
    expect(bff.cancellations()).toBe(0);
  });
}
test('explicit exact replay may first apply a cancellation absent after the initial POST', async ({
  page,
}) => {
  const bff = await installSimulatedRunCancellationBff(page);
  bff.setReview('eligible');
  bff.setNext('lost-uncommitted');
  await openRun(page);
  await page
    .getByRole('button', {
      name: 'Review untouched-run cancellation',
      exact: true,
    })
    .click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page
    .getByRole('button', { name: 'Cancel untouched run', exact: true })
    .click();
  const replay = page.getByRole('button', {
    name: 'Retry exact cancellation intent',
    exact: true,
  });
  await expect(replay).toBeVisible();
  expect(bff.cancellations()).toBe(0);
  expect(bff.intents()).toHaveLength(1);
  await replay.click();
  await expect(
    page.getByRole('heading', {
      name: 'Run cancellation recorded · case not closed',
      exact: true,
    }),
  ).toBeVisible();
  expect(bff.cancellations()).toBe(1);
  expect(bff.intents()[1]).toEqual(bff.intents()[0]);
});

async function openRun(page: Page): Promise<void> {
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: `Inspect run ${assignedRunId}` })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Review untouched-run cancellation',
      exact: true,
    }),
  ).toBeVisible();
}
