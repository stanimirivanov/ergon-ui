import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { runSupervisionGuide } from './guide/run-supervision-guide';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';
import { runGuideScenario } from './guide/user-guide-session';

test(
  'inspects assigned runs and hides private snapshots during failed rechecks',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      runSupervisionGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedRunSupervisionBff(page);
        await page.goto(supervisorTenantPath);
        const assignedNavigation = page.getByRole('link', {
          name: 'Assigned runs',
          exact: true,
        });
        await expect(assignedNavigation).toBeVisible();
        await guide.action('open-assigned-runs', assignedNavigation, () =>
          assignedNavigation.click(),
        );

        const assigned = page.getByRole('region', { name: 'Assigned runs' });
        const runButton = assigned.getByRole('button', {
          name: `Inspect run ${assignedRunId}`,
        });
        const resolution = page.getByRole('region', { name: 'Resolution run' });
        const outcome = page.getByRole('region', { name: 'Outcome proof' });
        await expect(runButton).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Select an assigned run' }),
        ).toBeVisible();
        expect(bff.consoleReads()).toBe(0);
        expect(new URL(page.url()).searchParams.get('view')).toBe('runs');
        await guide.result('inspect-discovery', assigned);

        await guide.action('select-assigned-run', runButton, async () => {
          await runButton.focus();
          await page.keyboard.press('Enter');
        });
        await expect(
          resolution.getByText('access-restoration', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByRole('heading', {
            name: 'Pinned step · verify-account-owner',
          }),
        ).toBeVisible();
        await expect(
          resolution.getByRole('heading', {
            name: 'Resolution run',
            exact: true,
          }),
        ).toBeFocused();
        expect(bff.consoleReads()).toBe(1);
        expect(page.url()).not.toContain(assignedRunId);
        await guide.result('inspect-run-snapshot', resolution);

        const policy = resolution.locator('summary', {
          hasText: 'Inspect recorded execution policy',
        });
        await guide.action('open-recorded-policy', policy, async () => {
          await policy.focus();
          await page.keyboard.press('Space');
        });
        await expect(
          resolution.getByText('identity.lookup', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByText('RESOLVER', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByText('policy-7', { exact: true }),
        ).toBeVisible();
        await expect(
          outcome.getByText('Evidence is not included in this read model.', {
            exact: false,
          }),
        ).toBeVisible();
        await expect(
          outcome.getByText(
            'Verification checks and accepted proof are not included in this read model.',
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: /Authorize|Approve|Steer|Handover/u,
          }),
        ).toHaveCount(0);
        expect(bff.consoleReads()).toBe(1);
        await guide.result('inspect-context-boundaries', outcome);

        bff.holdNextRunRead();
        const recheckRun = resolution.getByRole('button', {
          name: 'Recheck selected run',
        });
        await guide.action('recheck-selected-run', recheckRun, () =>
          recheckRun.click(),
        );
        const rechecking = page.getByRole('heading', {
          name: 'Rechecking run access…',
        });
        await expect(rechecking).toBeVisible();
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByText('policy-7', { exact: true })).toHaveCount(
          0,
        );
        await guide.result('inspect-hidden-context', rechecking);

        bff.releaseHeldRunRead('failure');
        const failure = page.getByRole('heading', {
          name: 'Run context could not be read',
        });
        await expect(failure).toBeVisible();
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        const retryRun = page.getByRole('button', { name: 'Retry run read' });
        await expect(retryRun).toBeVisible();
        await guide.result('inspect-temporary-failure', failure);

        bff.setRunReadMode('success');
        await guide.action('retry-run-read', retryRun, () => retryRun.click());
        await expect(
          resolution.getByText('access-restoration', { exact: true }),
        ).toBeVisible();
        expect(bff.commands()).toBe(0);
        await guide.result('inspect-restored-run', resolution);

        bff.setRunReadMode('terminal');
        await guide.action('read-recorded-terminal-state', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          outcome.getByRole('heading', {
            name: 'Recorded terminal state · proof not included',
          }),
        ).toBeVisible();
        await expect(
          outcome.getByText('Recorded resolved', { exact: true }),
        ).toBeVisible();
        bff.setActiveRunsVisible(false);
        const recheckAssigned = page.getByRole('button', {
          name: 'Recheck assigned runs',
        });
        await guide.action('refresh-active-discovery', recheckAssigned, () =>
          recheckAssigned.click(),
        );
        await expect(
          assigned.getByRole('heading', { name: 'No active assigned runs' }),
        ).toBeVisible();
        await expect(
          outcome.getByText('Recorded resolved', { exact: true }),
        ).toBeVisible();
        await expect(
          outcome.getByText(
            'Verification checks and accepted proof are not included in this read model.',
            { exact: true },
          ),
        ).toBeVisible();
        await guide.result('inspect-terminal-retention', outcome);

        const close = page.getByRole('button', { name: 'Close run' });
        await guide.action('close-private-run', close, () => close.click());
        await expect(
          page.getByRole('heading', { name: 'Select an assigned run' }),
        ).toBeVisible();
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        bff.setActiveRunsVisible(true);
        bff.setRunReadMode('not-found');
        await guide.action('rediscover-synthetic-run', recheckAssigned, () =>
          recheckAssigned.click(),
        );
        await expect(runButton).toBeVisible();
        await guide.action('open-unavailable-run', runButton, () =>
          runButton.click(),
        );
        const unavailable = page.getByRole('heading', {
          name: 'Run context is unavailable',
        });
        await expect(unavailable).toBeVisible();
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByText('policy-7', { exact: true })).toHaveCount(
          0,
        );
        await expect(
          page.getByRole('button', {
            name: /Authorize|Approve|Steer|Handover/u,
          }),
        ).toHaveCount(0);
        expect(page.url()).not.toContain(assignedRunId);
        expect(bff.commands()).toBe(0);
        await guide.result('inspect-neutral-unavailable', unavailable);

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);

test('assigned Console preserves three panes, keyboard access and narrow reflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bff = await installSimulatedRunSupervisionBff(page);
  await page.goto(`${supervisorTenantPath}?view=runs`);
  const assigned = page.getByRole('region', { name: 'Assigned runs' });
  const runButton = assigned.getByRole('button', {
    name: `Inspect run ${assignedRunId}`,
  });
  await expect(runButton).toBeVisible();
  await runButton.focus();
  await page.keyboard.press('Enter');
  const resolution = page.getByRole('region', { name: 'Resolution run' });
  const outcome = page.getByRole('region', { name: 'Outcome proof' });
  await expect(
    resolution.getByText('access-restoration', { exact: true }),
  ).toBeVisible();
  const desktopAssigned = await assigned.boundingBox();
  const desktopResolution = await resolution.boundingBox();
  const desktopOutcome = await outcome.boundingBox();
  if (
    desktopAssigned === null ||
    desktopResolution === null ||
    desktopOutcome === null
  ) {
    throw new Error('Assigned Console panes have no desktop bounds.');
  }
  expect(desktopAssigned.x + desktopAssigned.width).toBeLessThan(
    desktopResolution.x,
  );
  expect(desktopResolution.x + desktopResolution.width).toBeLessThan(
    desktopOutcome.x,
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('assigned-run-console-desktop.png'),
    animations: 'disabled',
  });

  // Halving the desktop CSS width exercises the reflow required at 200% zoom.
  await page.setViewportSize({ width: 720, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    resolution.getByText('access-restoration', { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const narrowAssigned = await assigned.boundingBox();
  const narrowResolution = await resolution.boundingBox();
  const narrowOutcome = await outcome.boundingBox();
  if (
    narrowAssigned === null ||
    narrowResolution === null ||
    narrowOutcome === null
  ) {
    throw new Error('Assigned Console panes have no narrow viewport bounds.');
  }
  expect(narrowAssigned.y + narrowAssigned.height).toBeLessThan(
    narrowResolution.y,
  );
  expect(narrowResolution.y + narrowResolution.height).toBeLessThan(
    narrowOutcome.y,
  );
  const policy = resolution.locator('summary', {
    hasText: 'Inspect recorded execution policy',
  });
  await policy.focus();
  await page.keyboard.press('Enter');
  await expect(
    resolution.getByText('identity.lookup', { exact: true }),
  ).toBeVisible();
  await expect(policy).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const narrowAccessibility = await new AxeBuilder({ page }).analyze();
  expect(narrowAccessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('assigned-run-console-narrow.png'),
    animations: 'disabled',
    fullPage: true,
  });
  expect(bff.consoleReads()).toBe(1);
  expect(bff.commands()).toBe(0);
  expect(page.url()).not.toContain(assignedRunId);
});
