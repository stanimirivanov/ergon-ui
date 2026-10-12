import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './guide/simulated-bff-response';
import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

const caseGoal = 'Restore access to the customer workspace';

test('owned Console panes remain reachable beneath a long goal at short desktop height', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 400 });
  // A real CaseGoal is trimmed and at most 500 characters in the domain kernel.
  const longGoal =
    'Restore workspace access only after checking the current claim, source provenance, diagnostic prerequisites, and the accepted outcome condition. '
      .repeat(3)
      .trim();
  expect(longGoal.length).toBeLessThanOrEqual(500);
  await installSimulatedOwnedContextBff(page, { caseGoal: longGoal });
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await expect(page.getByRole('heading', { name: longGoal })).toBeVisible();
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  for (const slot of ['leading', 'primary', 'trailing']) {
    const pane = await bounds(page.locator(`[data-pane-slot="${slot}"]`));
    expect(pane.height).toBeGreaterThan(0);
  }
  const evidenceJump = page.getByRole('button', { name: 'Jump to evidence' });
  await evidenceJump.focus();
  await page.keyboard.press('Enter');
  const evidenceHeading = page.getByRole('heading', {
    name: 'Recorded observations',
    exact: true,
  });
  await expect(evidenceHeading).toBeFocused();
  await expect
    .poll(async () => {
      const heading = await bounds(evidenceHeading);
      const main = await bounds(page.getByRole('main'));
      const pane = await bounds(page.locator('[data-pane-slot="leading"]'));
      return (
        heading.y >= main.y &&
        heading.y + heading.height <= main.y + main.height &&
        heading.y >= pane.y &&
        heading.y + heading.height <= pane.y + pane.height
      );
    })
    .toBe(true);
  await expectNoHorizontalOverflow(page);
});

test('owned Console keeps one app shell and three panes while private context is withheld', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installSimulatedOwnedContextBff(page);
  await page.goto(supervisorTenantPath);
  const openConsole = page.getByRole('button', {
    name: 'Open resolver console',
  });
  await expect(openConsole).toBeVisible();
  await expectShell(page, 'standard');

  await openConsole.click();
  await expect(page.getByRole('heading', { name: caseGoal })).toBeVisible();
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  await expectBelowToolbar(page, 'Current claim');
  await expectViewportAllocation(page);
  const desktopToolbar = await bounds(
    page.getByRole('region', { name: 'Current claim' }),
  );
  await page.setViewportSize({ width: 720, height: 450 });
  await expectPaneOrder(page, 'rows');
  await expectBelowToolbar(page, 'Current claim');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 812 });
  const narrowToolbar = await bounds(
    page.getByRole('region', { name: 'Current claim' }),
  );
  expect(narrowToolbar.height).toBeGreaterThan(desktopToolbar.height);
  await expectPaneOrder(page, 'rows');
  await expectBelowToolbar(page, 'Current claim');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  let summaryRequested = false;
  let finishSummary: () => void = () => undefined;
  const heldSummary = new Promise<void>((resolve) => {
    finishSummary = resolve;
  });
  // This controlled read is independent of the guide's ordinal fixture sequence.
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    async (route) => {
      summaryRequested = true;
      await heldSummary;
      await fulfillSimulatedBff(
        route,
        {
          type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
          title: 'Case context unavailable',
          status: 404,
        },
        404,
      );
    },
  );
  const recheckClaim = page.getByRole('button', {
    name: 'Recheck current claim',
  });
  await recheckClaim.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => summaryRequested).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Back to active work' }),
  ).toBeFocused();
  await expect(page.getByRole('heading', { name: caseGoal })).toHaveCount(0);
  await expect(
    page.getByText('The sign-in link returns an expired-token message.'),
  ).toHaveCount(0);
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');

  await expectViewportAllocation(page);
  finishSummary();
  await expect(
    page.getByRole('heading', {
      name: 'Case context is no longer available.',
    }),
  ).toBeVisible();
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  await expectViewportAllocation(page);
  await expect(page.getByRole('heading', { name: caseGoal })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Back to active work' }),
  ).toBeFocused();

  // The same complete withheld surface reflows without exposing an old payload.
  await page.setViewportSize({ width: 720, height: 450 });
  await expectPaneOrder(page, 'rows');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 812 });
  await expectPaneOrder(page, 'rows');
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Back to active work' }).click();
  await expect(openConsole).toBeVisible();
  await expectShell(page, 'standard');
  await expect(page.locator('[data-pane-slot]')).toHaveCount(0);
});

test('assigned Console allocates space beneath a wrapping toolbar in every read phase', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bff = await installSimulatedRunSupervisionBff(page);
  await page.goto(`${supervisorTenantPath}?view=runs`);
  const inspectRun = page.getByRole('button', {
    name: `Inspect run ${assignedRunId}`,
  });
  await expect(inspectRun).toBeVisible();
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  await expectBelowToolbar(page, 'Supervisor presence');
  await expectViewportAllocation(page);
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(new URL(page.url()).searchParams.get('view')).toBe('runs');
  expect(bff.consoleReads()).toBe(0);
  expect(bff.commands()).toBe(0);

  await inspectRun.click();
  const contract = page.getByText('access-restoration', { exact: true });
  const resolutionHeading = page.getByRole('heading', {
    name: 'Resolution run',
    exact: true,
  });
  await expect(contract).toBeVisible();
  const desktopToolbar = await bounds(
    page.getByRole('region', { name: 'Supervisor presence' }),
  );
  await expectBelowToolbar(page, 'Supervisor presence');
  await expectViewportAllocation(page);
  bff.holdNextRunRead();
  const recheckRun = page.getByRole('button', { name: 'Recheck selected run' });
  await recheckRun.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Rechecking run access…' }),
  ).toBeVisible();
  await expect(resolutionHeading).toBeFocused();
  await expect(contract).toHaveCount(0);
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  await expectBelowToolbar(page, 'Supervisor presence');
  await expectViewportAllocation(page);

  bff.releaseHeldRunRead('failure');
  await expect(
    page.getByRole('heading', { name: 'Run context could not be read' }),
  ).toBeVisible();
  await expect(resolutionHeading).toBeFocused();
  await expect(contract).toHaveCount(0);
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  await expectViewportAllocation(page);

  bff.setRunReadMode('success');
  bff.holdNextRunRead();
  const retryRun = page.getByRole('button', { name: 'Retry run read' });
  await retryRun.focus();
  await page.keyboard.press('Enter');
  await expect(resolutionHeading).toBeFocused();
  await expect(contract).toHaveCount(0);
  bff.releaseHeldRunRead('success');
  await expect(contract).toBeVisible();
  await expect(resolutionHeading).toBeFocused();

  bff.holdNextRunRead();
  const consoleReads = bff.consoleReads();
  const recheckAssigned = page.getByRole('button', {
    name: 'Recheck assigned runs',
  });
  await recheckAssigned.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => bff.consoleReads()).toBe(consoleReads + 1);
  await expect(contract).toHaveCount(0);
  await expect(resolutionHeading).toBeFocused();
  await expectShell(page, 'focused');
  await expectPaneOrder(page, 'columns');
  bff.releaseHeldRunRead('success');
  await expect(contract).toBeVisible();
  await expect(resolutionHeading).toBeFocused();
  // A halved CSS viewport exercises 1440x900 reflow at 200% zoom.
  // This is not a claim to automate the browser's own zoom control.
  await page.setViewportSize({ width: 720, height: 450 });
  await expectPaneOrder(page, 'rows');
  await expectBelowToolbar(page, 'Supervisor presence');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 812 });
  const narrowToolbar = await bounds(
    page.getByRole('region', { name: 'Supervisor presence' }),
  );
  expect(narrowToolbar.height).toBeGreaterThan(desktopToolbar.height);
  await expectPaneOrder(page, 'rows');
  await expectBelowToolbar(page, 'Supervisor presence');
  await expectNoHorizontalOverflow(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(bff.commands()).toBe(0);

  await page.getByRole('button', { name: 'Back to follow-ups' }).click();
  await expectShell(page, 'standard');
  await expect(
    page.getByRole('region', { name: 'Supervisor presence' }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('view')).toBeNull();
});

async function expectShell(
  page: Page,
  mode: 'standard' | 'focused',
): Promise<void> {
  const shell = page.locator('[data-workbench-mode]');
  await expect(shell).toHaveCount(1);
  await expect(shell).toHaveAttribute('data-workbench-mode', mode);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Ergon home' })).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(
    mode === 'standard' ? 1 : 0,
  );
  await expect(
    page.getByRole('navigation', { name: 'Workbench views' }),
  ).toHaveCount(mode === 'standard' ? 1 : 0);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Resolver Console' }),
  ).toHaveCount(mode === 'focused' ? 1 : 0);
}

async function expectPaneOrder(
  page: Page,
  direction: 'columns' | 'rows',
): Promise<void> {
  const paneBounds = [];
  for (const slot of ['leading', 'primary', 'trailing']) {
    const pane = page.getByRole('main').locator(`[data-pane-slot="${slot}"]`);
    await expect(pane).toHaveCount(1);
    await expect(pane).toBeVisible();
    paneBounds.push(await bounds(pane));
  }
  for (let index = 1; index < paneBounds.length; index += 1) {
    const previous = paneBounds[index - 1];
    const current = paneBounds[index];
    if (previous === undefined || current === undefined) {
      throw new Error('A complete Console must supply all three pane bounds.');
    }
    if (direction === 'columns') {
      expect(previous.x + previous.width).toBeLessThan(current.x);
    } else {
      expect(previous.y + previous.height).toBeLessThan(current.y);
    }
  }
}

async function expectBelowToolbar(page: Page, name: string): Promise<void> {
  const toolbar = await bounds(page.getByRole('region', { name }));
  const header = await bounds(page.getByRole('banner'));
  expect(toolbar.y).toBeGreaterThanOrEqual(header.y);
  expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(
    header.y + header.height,
  );
  for (const slot of ['leading', 'primary', 'trailing']) {
    const pane = await bounds(
      page.getByRole('main').locator(`[data-pane-slot="${slot}"]`),
    );
    expect(pane.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
    expect(pane.y).toBeGreaterThanOrEqual(header.y + header.height);
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

async function expectViewportAllocation(page: Page): Promise<void> {
  const main = await bounds(page.getByRole('main'));
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(main.y + main.height).toBeLessThanOrEqual(viewportHeight);
  for (const slot of ['leading', 'primary', 'trailing']) {
    const pane = await bounds(
      page.getByRole('main').locator(`[data-pane-slot="${slot}"]`),
    );
    expect(pane.height).toBeGreaterThan(0);
    expect(pane.y + pane.height).toBeLessThanOrEqual(main.y + main.height);
  }
}

async function bounds(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const result = await locator.boundingBox();
  if (result === null)
    throw new Error('A visible shell section has no bounds.');
  return result;
}
