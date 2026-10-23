import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runEscalationGuide } from './guide/run-escalation-guide';
import {
  installSimulatedRunEscalationBff,
  escalationPrivatePolicy,
  escalationWorkId,
} from './guide/simulated-run-escalation-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test(
  'confirms exhausted recovery and distinguishes historical creation from current run and follow-up access',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runEscalationGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunEscalationBff(page);
        await openFailed(page);
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        const review = page.getByRole('button', {
          name: 'Review exhausted-run escalation',
          exact: true,
        });
        const dialog = page.getByRole('dialog', {
          name: 'Review exhausted-run escalation',
          exact: true,
        });
        const cancel = dialog.getByRole('button', {
          name: 'Cancel escalation review',
          exact: true,
        });
        const submit = dialog.getByRole('button', {
          name: 'Open unassigned human follow-up',
          exact: true,
        });
        const acknowledge = dialog.getByRole('checkbox');
        expect(bff.reviews()).toBe(0);
        expect(bff.intents()).toHaveLength(0);
        await expect(
          page.getByText('Attempt 2', { exact: true }),
        ).toBeVisible();
        await guide.result('inspect', heading);
        await review.click();
        await expect(dialog.getByRole('status')).toContainText(
          'Browser exhausted-run escalation is disabled',
        );
        await expect(submit).toHaveCount(0);
        expect(bff.creations()).toBe(0);
        await guide.result('disabled', dialog);
        await cancel.click();
        bff.setEnabled(true);
        await review.click();
        await expect(submit).toBeVisible();
        expect(bff.reviews()).toBe(2);
        await expect(dialog).toContainText('2 / 2');
        await expect(dialog).toContainText('access-restoration');
        await guide.result('review', dialog);
        await submit.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Acknowledge the terminal escalation boundary',
        );
        expect(bff.intents()).toHaveLength(0);
        await guide.result('acknowledge', dialog);
        await cancel.click();
        await expect(review).toBeFocused();
        expect(bff.intents()).toHaveLength(0);
        await guide.result('cancel', review);
        await page.setViewportSize({ width: 320, height: 800 });
        await review.click();
        await expect(submit).toBeVisible();
        await expect(
          dialog.getByRole('heading', {
            name: 'Review exhausted-run escalation',
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
        await guide.result('keyboard', dialog);
        await page.keyboard.press('Escape');
        await expect(review).toBeFocused();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await review.click();
        await expect(submit).toBeVisible();
        bff.setNext('conflict');
        await acknowledge.check();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Escalation acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: 'Retry exact escalation intent',
            exact: true,
          }),
        ).toHaveCount(0);
        expect(bff.creations()).toBe(0);
        await guide.result('conflict', heading);
        await page
          .getByRole('button', {
            name: 'Recheck run before escalation review',
            exact: true,
          })
          .click();
        await expect(review).toBeVisible();
        await review.click();
        await expect(submit).toBeVisible();
        await expect(dialog).toContainText('1 / 1');
        await guide.result('refresh', dialog);
        bff.setNext('lost-committed');
        bff.holdCommand();
        await acknowledge.check();
        await submit.click();
        await expect(
          page.getByRole('heading', {
            name: 'Exhausted-run escalation pending…',
            exact: true,
          }),
        ).toBeVisible();
        await expect.poll(() => bff.intents().length).toBe(2);
        await guide.result('confirm', heading);
        await expect(dialog).toHaveCount(0);
        await expect(heading).toBeFocused();
        await expect(
          page.getByText(escalationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await guide.result('barrier', heading);
        bff.releaseCommand();
        await expect(
          page.getByRole('heading', {
            name: 'Escalation acknowledgement unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(/If it never committed, this may first open/),
        ).toBeVisible();
        expect(bff.creations()).toBe(1);
        await guide.result('uncertain', heading);
        await page
          .getByRole('button', {
            name: 'Retry exact escalation intent',
            exact: true,
          })
          .click();
        await expect(
          page.getByRole('heading', {
            name: 'Human follow-up creation recorded · not claimed',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.intents()).toHaveLength(3);
        expect(bff.intents()[2]).toEqual(bff.intents()[1]);
        expect(bff.creations()).toBe(1);
        await guide.result(
          'replay',
          page.getByText(escalationWorkId, { exact: true }),
        );
        await expect(
          page
            .getByRole('group', { name: 'Run execution', exact: true })
            .getByText('Escalated', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: `Inspect run ${assignedRunId}` }),
        ).toHaveCount(0);
        await expect(
          page.getByText(/OPEN describes original creation/),
        ).toBeVisible();
        await expect(
          page.getByText(escalationWorkId, { exact: true }),
        ).toBeVisible();
        await expect(review).toHaveCount(0);
        await guide.result(
          'terminal',
          page
            .getByRole('group', { name: 'Run outcome', exact: true })
            .getByText('Escalated', { exact: true }),
        );
        bff.holdNextRead();
        await page
          .getByRole('button', { name: 'Recheck selected run', exact: true })
          .click();
        await expect(
          page.getByText(escalationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(heading).toBeFocused();
        await guide.result('held', heading);
        bff.setReadAccess(false);
        bff.releaseRead();
        await expect(
          page.getByRole('heading', {
            name: 'Run context is unavailable',
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(escalationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        expect(bff.intents()).toHaveLength(3);
        await guide.result('denied', heading);
        bff.setReadAccess(true);
        await page
          .getByRole('button', { name: 'Recheck assigned runs', exact: true })
          .click();
        await expect(
          page
            .getByRole('group', { name: 'Run execution', exact: true })
            .getByText('Escalated', { exact: true }),
        ).toBeVisible();
        await page
          .getByText('Inspect recorded execution policy', { exact: true })
          .click();
        await expect(
          page.getByText(escalationPrivatePolicy, { exact: true }),
        ).toBeVisible();
        await guide.result('restore', heading);
        const queueRead = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname ===
              `/bff/v1${supervisorTenantPath}/human-follow-ups` &&
            response.request().method() === 'GET' &&
            response.status() === 200,
        );
        await page
          .getByRole('button', { name: 'Back to follow-ups', exact: true })
          .click();
        await queueRead;
        const inbox = page.getByRole('region', { name: 'Open follow-up work' });
        await expect(
          inbox.getByRole('heading', { name: 'Retry attempt limit reached' }),
        ).toBeVisible();
        await expect(
          inbox
            .getByRole('list', { name: 'Open human follow-ups' })
            .locator('li'),
        ).toHaveCount(1);
        await expect(
          inbox.getByRole('definition').filter({
            hasText: '22222222-2222-4222-8222-222222222222',
          }),
        ).toHaveText('22222222-2222-4222-8222-222222222222');
        await expect(inbox).toContainText('access-restoration');
        expect(bff.commands()).toBe(3);
        await expect(
          page.getByRole('heading', {
            name: 'No active claimed work in this view.',
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.intents()).toHaveLength(3);
        expect(bff.creations()).toBe(1);
        await guide.result(
          'queue',
          inbox.getByRole('button', {
            name: 'Claim Retry attempt limit reached follow-up',
            exact: true,
          }),
        );
      },
    );
  },
);

for (const mode of [
  'unsupported',
  'denied',
  'malformed',
  'remaining-budget',
] as const) {
  test(`does not create escalation intent from ${mode} review`, async ({
    page,
  }) => {
    const bff = await installSimulatedRunEscalationBff(page);
    bff.setEnabled(true);
    bff.setReviewMode(mode);
    await openFailed(page);
    await page
      .getByRole('button', {
        name: 'Review exhausted-run escalation',
        exact: true,
      })
      .click();
    if (mode === 'remaining-budget') {
      await expect(page.getByRole('dialog').getByRole('status')).toContainText(
        'Retry budget remains',
      );
    } else {
      await expect(
        page.getByRole('heading', {
          name: 'Escalation review unavailable',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByText(escalationPrivatePolicy, { exact: true }),
      ).toHaveCount(0);
    }
    await expect(
      page.getByRole('button', {
        name: 'Open unassigned human follow-up',
        exact: true,
      }),
    ).toHaveCount(0);
    expect(bff.intents()).toHaveLength(0);
    expect(bff.creations()).toBe(0);
  });
}
test('exact escalation replay can first commit intent when the initial request never committed', async ({
  page,
}) => {
  const bff = await installSimulatedRunEscalationBff(page);
  bff.setEnabled(true);
  bff.setNext('lost-uncommitted');
  await openFailed(page);
  await page
    .getByRole('button', {
      name: 'Review exhausted-run escalation',
      exact: true,
    })
    .click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page
    .getByRole('button', {
      name: 'Open unassigned human follow-up',
      exact: true,
    })
    .click();
  const replay = page.getByRole('button', {
    name: 'Retry exact escalation intent',
    exact: true,
  });
  await expect(replay).toBeVisible();
  expect(bff.creations()).toBe(0);
  expect(bff.intents()).toHaveLength(1);
  await replay.click();
  await expect(
    page.getByRole('heading', {
      name: 'Human follow-up creation recorded · not claimed',
      exact: true,
    }),
  ).toBeVisible();
  expect(bff.creations()).toBe(1);
  expect(bff.intents()[1]).toEqual(bff.intents()[0]);
});
async function openFailed(page: Page): Promise<void> {
  await page.goto(supervisorTenantPath);
  await page.getByRole('link', { name: 'Assigned runs', exact: true }).click();
  await page
    .getByRole('button', { name: `Inspect run ${assignedRunId}` })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Review exhausted-run escalation',
      exact: true,
    }),
  ).toBeVisible();
}
