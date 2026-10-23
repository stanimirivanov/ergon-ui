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
        const evidence = page.getByRole('region', {
          name: 'Case evidence',
          exact: true,
        });
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
          resolution.getByText('305.123456 ms', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByText('Connector succeeded', { exact: true }),
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

        const records = resolution.getByRole('region', {
          name: 'Recorded execution',
          exact: true,
        });
        await expect(
          records
            .getByText('Snapshot revision', { exact: true })
            .locator('..')
            .getByRole('definition'),
        ).toHaveText('0');
        await guide.action(
          'locate-execution-first-sections',
          page.getByRole('button', { name: 'Jump to execution', exact: true }),
          async () => {
            await page
              .getByRole('button', { name: 'Jump to execution', exact: true })
              .focus();
            await page.keyboard.press('Enter');
          },
        );
        const orderedSections = [
          'Recorded execution',
          'Run actions',
          'Supporting inspection',
          'Attempt context',
        ];
        for (const [beforeName, afterName] of [
          ['Recorded execution', 'Run actions'],
          ['Run actions', 'Supporting inspection'],
          ['Supporting inspection', 'Attempt context'],
        ] as const) {
          const before = resolution.getByRole('region', {
            name: beforeName,
            exact: true,
          });
          const after = resolution.getByRole('region', {
            name: afterName,
            exact: true,
          });
          expect((await before.boundingBox())?.y).toBeLessThan(
            (await after.boundingBox())?.y ?? -1,
          );
        }
        await expect(
          records.getByRole('heading', { name: 'Connector result recorded' }),
        ).toBeVisible();
        expect(bff.consoleReads()).toBe(1);
        expect(bff.commands()).toBe(0);
        await guide.result('interpret-execution-first-sections', records);

        const locationBeforeJumps = page.url();
        const sectionJumps = page.getByRole('group', {
          name: 'Console section jumps',
        });
        await guide.action(
          'navigate-console-sections',
          sectionJumps.getByRole('button', { name: 'Jump to outcome proof' }),
          async () => {
            for (const [button, heading] of [
              ['Jump to assigned runs', 'Assigned runs'],
              ['Jump to case evidence', 'Case evidence'],
              ['Jump to execution', 'Resolution run'],
              ['Jump to outcome proof', 'Outcome proof'],
            ] as const) {
              await sectionJumps
                .getByRole('button', { name: button, exact: true })
                .focus();
              await page.keyboard.press('Enter');
              await expect(
                page.getByRole('heading', { name: heading, exact: true }),
              ).toBeFocused();
            }
          },
        );
        expect(page.url()).toBe(locationBeforeJumps);
        expect(bff.consoleReads()).toBe(1);
        expect(bff.commands()).toBe(0);
        await guide.result('inspect-section-destination', outcome);

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
          evidence.getByText('This server does not supply pinned evidence.', {
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

        const measurement = resolution.locator('summary', {
          hasText: 'Inspect execution measurement',
        });
        await guide.action(
          'open-execution-measurement',
          measurement,
          async () => {
            await measurement.focus();
            await page.keyboard.press('Enter');
          },
        );
        await expect(
          resolution.getByText('305123456', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByText('ergon.dev/measurement/connector-call/v1', {
            exact: true,
          }),
        ).toBeVisible();
        expect(bff.consoleReads()).toBe(1);
        await guide.result(
          'inspect-measured-call',
          resolution.getByRole('region', { name: 'Connector result recorded' }),
        );

        const recheckRun = resolution.getByRole('button', {
          name: 'Recheck selected run',
        });
        bff.setExecutionMode('zero');
        await guide.action('recheck-zero-measurement', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          resolution.getByText('0 ms', { exact: true }),
        ).toBeVisible();
        await guide.result(
          'inspect-measured-zero',
          resolution.getByRole('region', { name: 'Connector result recorded' }),
        );

        bff.setExecutionMode('historical-failure');
        await guide.action('recheck-unmeasured-result', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          resolution.getByText('Connector failed', { exact: true }),
        ).toBeVisible();
        await expect(
          resolution.getByText('Unmeasured', { exact: true }),
        ).toBeVisible();
        await expect(resolution.getByText('0 ms', { exact: true })).toHaveCount(
          0,
        );
        await guide.result(
          'inspect-unmeasured-result',
          resolution.getByRole('region', { name: 'Connector result recorded' }),
        );

        bff.setExecutionMode('no-receipt');
        await guide.action('recheck-no-receipt', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          resolution.getByRole('heading', {
            name: 'No terminal result recorded',
          }),
        ).toBeVisible();
        await expect(
          resolution.getByText('synthetic-identity-gateway', { exact: true }),
        ).toHaveCount(0);
        await guide.result(
          'inspect-no-receipt',
          resolution.getByRole('region', {
            name: 'Capability execution',
            exact: true,
          }),
        );

        bff.setExecutionMode('legacy');
        await guide.action('recheck-older-server', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          resolution.getByRole('heading', {
            name: 'Execution detail unavailable',
          }),
        ).toBeVisible();
        await expect(
          resolution.getByText(/Whether a terminal receipt exists is unknown/u),
        ).toBeVisible();
        await guide.result(
          'inspect-older-server',
          resolution.getByRole('region', {
            name: 'Capability execution',
            exact: true,
          }),
        );

        bff.setExecutionMode('measured');
        await guide.action('restore-measured-snapshot', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          resolution.getByText('305.123456 ms', { exact: true }),
        ).toBeVisible();
        await expect(
          outcome.getByText('Waiting for approval', { exact: true }),
        ).toBeVisible();
        await guide.result(
          'inspect-result-state-boundary',
          resolution.getByRole('region', { name: 'Connector result recorded' }),
        );

        const history = resolution.getByRole('region', {
          name: 'Recorded run transitions',
        });
        await expect(
          history.getByText(/No state transition has been recorded/u),
        ).toBeVisible();
        bff.setRunReadMode('projected');
        await guide.action('recheck-projected-result', recheckRun, () =>
          recheckRun.click(),
        );
        await expect(
          history.getByRole('heading', {
            name: '1 · Capability success projected',
          }),
        ).toBeVisible();
        await expect(
          outcome.getByText('Verifying', { exact: true }),
        ).toBeVisible();
        await guide.result('inspect-projected-history', history);
        bff.holdNextRunRead();
        await guide.action('recheck-selected-run', recheckRun, () =>
          recheckRun.click(),
        );
        const rechecking = page.getByRole('heading', {
          name: 'Rechecking run access…',
        });
        await expect(rechecking).toBeVisible();
        for (const name of orderedSections) {
          await expect(
            resolution.getByRole('region', { name, exact: true }),
          ).toHaveCount(0);
        }
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByText('policy-7', { exact: true })).toHaveCount(
          0,
        );
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByText('305.123456 ms', { exact: true }),
        ).toHaveCount(0);
        await guide.result('inspect-hidden-context', rechecking);
        await expect(
          page.getByRole('heading', {
            name: '1 · Capability success projected',
          }),
        ).toHaveCount(0);

        bff.releaseHeldRunRead('failure');
        const failure = page.getByRole('heading', {
          name: 'Run context could not be read',
        });
        await expect(failure).toBeVisible();
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        const retryRun = page.getByRole('button', { name: 'Retry run read' });
        await expect(
          page.getByText('305.123456 ms', { exact: true }),
        ).toHaveCount(0);
        await expect(retryRun).toBeVisible();
        await guide.result('inspect-temporary-failure', failure);

        bff.setRunReadMode('projected');
        await guide.action('retry-run-read', retryRun, () => retryRun.click());
        await expect(
          resolution.getByText('access-restoration', { exact: true }),
        ).toBeVisible();
        expect(bff.commands()).toBe(0);
        await guide.result('inspect-restored-run', resolution);
        await expect(
          resolution.getByText('305.123456 ms', { exact: true }),
        ).toBeVisible();

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
        await expect(
          history.getByRole('heading', {
            name: '2 · Outcome proof acceptance recorded',
          }),
        ).toBeVisible();
        await guide.result('inspect-terminal-transitions', history);
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
        await expect(
          page.getByText('305.123456 ms', { exact: true }),
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
        await expect(
          page.getByText('synthetic-identity-gateway', { exact: true }),
        ).toHaveCount(0);

        bff.showPagedAssignments();
        await guide.action(
          'prepare-assignment-traversal',
          recheckAssigned,
          () => recheckAssigned.click(),
        );
        const nextPage = page.getByRole('button', {
          name: 'Next assigned page',
        });
        await expect(nextPage).toBeEnabled();
        bff.rejectNextAssignedPage();
        const readsBeforeRejectedPage = bff.assignedReads();
        await guide.action('open-rejected-assignment-page', nextPage, () =>
          nextPage.click(),
        );
        const resetPage = page.getByRole('button', {
          name: 'Return to first assigned page',
        });
        await expect(resetPage).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Retry assigned runs' }),
        ).toHaveCount(0);
        await expect(
          resolution.getByText(/Retry assigned runs to recheck access/u),
        ).toHaveCount(0);
        expect(bff.assignedReads()).toBe(readsBeforeRejectedPage + 1);
        expect(bff.assignedCursors().at(-1)).toEqual({
          assignedAt: '2026-09-21T09:02:00Z',
          assignmentId: '55555555-5555-4555-8555-555555555555',
        });
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        const readsBeforeReset = bff.assignedReads();
        let resetRequested = false;
        let releaseReset: () => void = () => undefined;
        const heldResetRead = new Promise<void>((resolve) => {
          releaseReset = resolve;
        });
        // Hold the fresh request without bypassing the fixture's cursor checks.
        await page.route(
          '**/bff/v1/tenants/*/resolution-runs/assigned?*',
          async (route) => {
            resetRequested = true;
            await heldResetRead;
            await route.fallback();
          },
          { times: 1 },
        );
        await guide.action(
          'reset-assignment-traversal',
          resetPage,
          async () => {
            await resetPage.focus();
            await page.keyboard.press('Enter');
          },
        );
        await expect.poll(() => resetRequested).toBe(true);
        const resolutionHeading = resolution.getByRole('heading', {
          name: 'Resolution run',
          exact: true,
        });
        await expect(resolutionHeading).toBeFocused();
        await expect(runButton).toHaveCount(0);
        await expect(
          page.getByText('access-restoration', { exact: true }),
        ).toHaveCount(0);
        releaseReset();
        await expect(runButton).toBeVisible();
        await expect.poll(() => bff.assignedReads()).toBe(readsBeforeReset + 1);
        await expect(resolutionHeading).toBeFocused();
        expect(bff.assignedCursors().at(-1)).toEqual({
          assignedAt: null,
          assignmentId: null,
        });
        await expect(
          page.getByRole('button', { name: 'Previous assigned page' }),
        ).toBeDisabled();
        await expect(
          page.getByRole('heading', { name: 'Select an assigned run' }),
        ).toBeVisible();
        expect(bff.commands()).toBe(0);

        await guide.result('inspect-reset-assignment-page', assigned);
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
  bff.setRunReadMode('projected');
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
    resolution.getByRole('heading', {
      name: '1 · Capability success projected',
    }),
  ).toBeVisible();
  await expect(
    resolution.getByText('access-restoration', { exact: true }),
  ).toBeVisible();
  const desktopAssigned = await assigned.boundingBox();
  const caseEvidence = page.getByRole('region', {
    name: 'Case evidence',
    exact: true,
  });
  const desktopEvidence = await caseEvidence.boundingBox();
  expect(desktopEvidence).not.toBeNull();
  expect(desktopEvidence?.x).toBeCloseTo(desktopAssigned?.x ?? -1);
  await expect(
    outcome.getByRole('region', { name: 'Case context', exact: true }),
  ).toHaveCount(0);
  await expect(
    outcome.getByRole('region', { name: 'Pinned case evidence', exact: true }),
  ).toHaveCount(0);
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
  const executionViewport = page.getByRole('group', {
    name: 'Run execution',
    exact: true,
  });
  const inspectionEntries = [
    ['Pinned resolution contract', 'Inspect pinned contract'],
    ['Readiness at run pin', 'Inspect pinned readiness'],
    ['Execution admission history', 'Inspect recorded admissions'],
    ['Gateway-attempt history', 'Inspect gateway attempts'],
  ] as const;
  for (const [title, action] of inspectionEntries) {
    const row = resolution.getByRole('region', { name: title, exact: true });
    const titleBox = await row
      .getByRole('heading', { name: title, exact: true })
      .boundingBox();
    const button = row.getByRole('button', { name: action, exact: true });
    const buttonBox = await button.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThan(
      buttonBox?.x ?? -1,
    );
    await expect(button).toBeDisabled();
    await expect(
      row.getByText('supported supervision epoch', { exact: false }),
    ).toBeVisible();
  }
  const recordSections = [
    'Recorded execution',
    'Run actions',
    'Supporting inspection',
    'Attempt context',
  ];
  const sectionOrder = await resolution
    .getByRole('region')
    .evaluateAll(
      (elements, names) =>
        elements
          .map(
            (element) =>
              element.getAttribute('aria-label') ??
              element.querySelector('h3')?.textContent ??
              '',
          )
          .filter((name) => names.includes(name)),
      recordSections,
    );
  expect(sectionOrder).toEqual(recordSections);
  await page
    .getByRole('button', { name: 'Jump to execution', exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('assigned-run-console-execution-first.png'),
    animations: 'disabled',
  });
  await executionViewport.focus();
  const executionScroll = await executionViewport.evaluate(
    (element) => element.scrollTop,
  );
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => executionViewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(executionScroll);
  const measurement = resolution.locator('summary', {
    hasText: 'Inspect execution measurement',
  });
  await measurement.focus();
  await page.keyboard.press('Enter');
  await expect(
    resolution.getByText('305123456', { exact: true }),
  ).toBeVisible();
  await expect(measurement).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('assigned-run-console-desktop.png'),
    animations: 'disabled',
  });

  const outcomeViewport = page.getByRole('group', {
    name: 'Run outcome',
    exact: true,
  });
  await outcomeViewport.focus();
  await expect(outcomeViewport).toBeFocused();
  // Proof may fit now that pinned inputs have their own section. End must reach
  // the actual boundary, including zero, rather than requiring artificial content.
  const outcomeScrollLimit = await outcomeViewport.evaluate((element) =>
    Math.max(0, element.scrollHeight - element.clientHeight),
  );
  await page.keyboard.press('End');
  await expect
    .poll(() => outcomeViewport.evaluate((element) => element.scrollTop))
    .toBe(outcomeScrollLimit);
  await expect(outcomeViewport).toBeFocused();
  await page.keyboard.press('Home');
  await expect
    .poll(() => outcomeViewport.evaluate((element) => element.scrollTop))
    .toBe(0);

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
  for (const [title, action] of inspectionEntries) {
    const row = resolution.getByRole('region', { name: title, exact: true });
    const button = row.getByRole('button', { name: action, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    expect(
      await row.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await expect(
      row.getByText('supported supervision epoch', { exact: false }),
    ).toBeVisible();
  }
  for (const [beforeName, afterName] of [
    ['Recorded execution', 'Run actions'],
    ['Run actions', 'Supporting inspection'],
    ['Supporting inspection', 'Attempt context'],
  ] as const) {
    const before = resolution.getByRole('region', {
      name: beforeName,
      exact: true,
    });
    const after = resolution.getByRole('region', {
      name: afterName,
      exact: true,
    });
    const previous = await before.boundingBox();
    const next = await after.boundingBox();
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    expect((previous?.y ?? 0) + (previous?.height ?? 0)).toBeLessThan(
      next?.y ?? -1,
    );
  }
  for (const [button, heading] of [
    ['Jump to assigned runs', 'Assigned runs'],
    ['Jump to case evidence', 'Case evidence'],
    ['Jump to execution', 'Resolution run'],
    ['Jump to outcome proof', 'Outcome proof'],
  ] as const) {
    const jump = page.getByRole('button', { name: button, exact: true });
    await jump.scrollIntoViewIfNeeded();
    await jump.focus();
    await page.keyboard.press('Space');
    const destination = page.getByRole('heading', {
      name: heading,
      exact: true,
    });
    await expect(destination).toBeFocused();
    await expect(destination).toBeInViewport();
  }
  const narrowAssigned = await assigned.boundingBox();
  const narrowEvidence = await caseEvidence.boundingBox();
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
  expect(narrowEvidence).not.toBeNull();
  expect(narrowAssigned.y + narrowAssigned.height).toBeLessThan(
    narrowEvidence?.y ?? -1,
  );
  expect((narrowEvidence?.y ?? 0) + (narrowEvidence?.height ?? 0)).toBeLessThan(
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
  await measurement.focus();
  await expect(
    resolution.getByText('305123456', { exact: true }),
  ).toBeVisible();
  await expect(measurement).toBeFocused();
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
