import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runControlGuide } from './guide/run-control-guide';
import { installSimulatedRunControlBff } from './guide/simulated-run-control-bff';
import {
  assignedRunId,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';
import { cancellationPrivatePolicy } from './guide/simulated-run-cancellation-bff';

test(
  'coordinates explicit browser control and preserves fences through uncertain acknowledgement',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) => {
    await runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runControlGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunControlBff(page);
        await page.goto(supervisorTenantPath);
        await page
          .getByRole('link', { name: 'Assigned runs', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Inspect run ' + assignedRunId })
          .click();
        const panel = page.getByRole('region', {
          name: 'Browser control',
          exact: true,
        });
        const acquire = panel.getByRole('button', {
          name: 'Acquire browser control',
        });
        const recheck = panel.getByRole('button', {
          name: 'Recheck browser control',
        });
        const heading = page.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        await expect(acquire).toBeVisible();
        expect(bff.controlIntents()).toHaveLength(0);
        await expect(
          page.getByRole('button', {
            name: 'Review untouched-run cancellation',
            exact: true,
          }),
        ).toHaveCount(0);
        await guide.result('available', panel);

        bff.loseNextControlResponse();
        await acquire.click();
        const replayControl = panel.getByRole('button', {
          name: 'Retry exact control intent',
        });
        await expect(replayControl).toBeVisible();
        expect(bff.controlIntents()).toHaveLength(1);
        await guide.result('lost', panel);

        await replayControl.click();
        await expect(panel).toContainText('This browser session holds control');
        expect(bff.controlIntents()[1]).toEqual(bff.controlIntents()[0]);
        const first = bff.currentFence();
        await guide.result('replay-control', panel);

        await panel
          .getByRole('button', { name: 'Renew browser control' })
          .click();
        await expect(panel).toContainText(
          'Control renew acknowledged historically',
        );
        await expect(
          panel.getByRole('button', { name: 'Release browser control' }),
        ).toBeVisible();
        expect(bff.controlIntents()[2]).toMatchObject({
          action: 'RENEW',
          control: first,
        });
        await guide.result('renew', panel);

        await panel
          .getByRole('button', { name: 'Release browser control' })
          .click();
        await expect(acquire).toBeVisible();
        expect(bff.cancellations()).toBe(0);
        expect(bff.controlIntents()[3]).toMatchObject({
          action: 'RELEASE',
          control: first,
        });
        await guide.result('release', panel);

        bff.otherSession();
        await recheck.click();
        await expect(panel).toContainText(
          'Another browser session holds control',
        );
        await expect(acquire).toHaveCount(0);
        await expect(
          panel.getByRole('button', { name: 'Renew browser control' }),
        ).toHaveCount(0);
        await guide.result('other-session', panel);

        bff.expire();
        await recheck.click();
        await expect(panel).toContainText('Browser control expired');
        expect(bff.controlIntents()).toHaveLength(4);
        await guide.result('expire', panel);

        await acquire.click();
        await expect(panel).toContainText('This browser session holds control');
        expect(bff.currentFence().revision).toBeGreaterThan(first.revision);
        await guide.result('reacquire', panel);

        await page.setViewportSize({ width: 320, height: 900 });
        await panel
          .getByRole('button', { name: 'Renew browser control' })
          .focus();
        await expect(
          panel.getByRole('button', { name: 'Renew browser control' }),
        ).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(
          panel.getByRole('button', { name: 'Release browser control' }),
        ).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(
          panel.getByRole('button', { name: 'Renew browser control' }),
        ).toBeFocused();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .include('[aria-label="Browser control"]')
              .analyze()
          ).violations,
        ).toEqual([]);
        await guide.result('narrow', panel);
        await page.setViewportSize({ width: 1440, height: 1000 });

        await page
          .getByRole('button', {
            name: 'Review untouched-run cancellation',
            exact: true,
          })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Review untouched-run cancellation',
          exact: true,
        });
        await dialog.getByRole('checkbox').check();
        expect(bff.intents()).toHaveLength(0);
        await guide.result('confirm', dialog);

        bff.setNext('lost-committed');
        bff.holdCommand();
        await dialog
          .getByRole('button', { name: 'Cancel untouched run', exact: true })
          .click();
        await expect.poll(() => bff.intents().length).toBe(1);
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByText(cancellationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        await expect(heading).toBeFocused();
        expect(bff.intents()[0]).toMatchObject({ control: bff.currentFence() });
        await guide.result('pending', heading);

        bff.releaseCommand();
        const replay = page.getByRole('button', {
          name: 'Retry exact cancellation intent',
        });
        await expect(replay).toBeVisible();
        expect(bff.cancellations()).toBe(1);
        expect(bff.controlIntents()).toHaveLength(5);
        await guide.result('uncertain', replay);

        await replay.click();
        await expect(
          page.getByRole('heading', {
            name: 'Run cancellation recorded · case not closed',
            exact: true,
          }),
        ).toBeVisible();
        await expect(panel).toContainText('Terminal run · no new control');
        expect(bff.intents()[1]).toEqual(bff.intents()[0]);
        expect(bff.cancellations()).toBe(1);
        expect(bff.controlIntents()).toHaveLength(5);
        await guide.result('replay-business', panel);

        await expect(
          page
            .getByRole('group', { name: 'Run execution' })
            .getByText('Cancelled', { exact: true }),
        ).toBeVisible();
        await expect(acquire).toHaveCount(0);
        await expect(
          panel.getByRole('button', { name: 'Renew browser control' }),
        ).toHaveCount(0);
        await guide.result('terminal', panel);

        bff.denyControl();
        await recheck.click();
        await expect(panel).toContainText('Browser control unavailable');
        await expect(
          page.getByText(cancellationPrivatePolicy, { exact: true }),
        ).toHaveCount(0);
        expect(bff.intents()).toHaveLength(2);
        expect(bff.controlIntents()).toHaveLength(5);
        await guide.result('denied', panel);
      },
    );
  },
);

test('retires an open confirmation at advisory expiry without automatic renewal or takeover', async ({
  page,
}) => {
  const bff = await installSimulatedRunControlBff(page);
  await page.clock.install();
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await page.getByRole('button', { name: 'Acquire browser control' }).click();
  await page
    .getByRole('button', {
      name: 'Review untouched-run cancellation',
      exact: true,
    })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.fastForward(121_000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Resolution run', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Browser control', exact: true }),
  ).toContainText('Browser control expired');
  await expect(
    page.getByRole('button', {
      name: 'Review untouched-run cancellation',
      exact: true,
    }),
  ).toHaveCount(0);
  expect(bff.controlIntents()).toHaveLength(1);
  expect(bff.intents()).toHaveLength(0);
});
