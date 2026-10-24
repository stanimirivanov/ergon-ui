import AxeBuilder from '@axe-core/playwright';
import { installSimulatedFollowUpHandoverBff } from './guide/simulated-follow-up-handover-bff';
import { installSimulatedFollowUpCompletionBff } from './guide/simulated-follow-up-completion-bff';
import { installSimulatedFollowUpPriorityBff } from './guide/simulated-follow-up-priority-bff';
import { expect, test } from '@playwright/test';
import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';
import { installSimulatedInboxBff } from './guide/simulated-inbox-bff';
import { installSimulatedRunExecutionBff } from './guide/simulated-run-execution-bff';
import { installSimulatedRunEvidenceBff } from './guide/simulated-run-evidence-bff';
import { installSimulatedRunVerificationBff } from './guide/simulated-run-verification-bff';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  supervisorTenantPath,
} from './guide/simulated-run-supervision-bff';

test.beforeEach(async ({ page, browserName }) => {
  expect(browserName).toBe('chromium');
  expect(await page.evaluate(() => navigator.platform)).toContain('Linux');
});

test('priority review distinguishes independent metadata at desktop and narrow widths', async ({
  page,
}) => {
  await installSimulatedFollowUpPriorityBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await page
    .getByRole('button', { name: 'Change priority', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Change owned follow-up priority',
  });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveScreenshot('follow-up-priority.png');
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('follow-up-priority-narrow.png');
});

test('direct follow-up handover confirmation explains private-access loss at desktop and narrow widths', async ({
  page,
}) => {
  await installSimulatedFollowUpHandoverBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await page
    .getByRole('button', { name: 'Hand over follow-up', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Hand over owned follow-up',
  });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveScreenshot('follow-up-handover.png');
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('follow-up-handover-narrow.png');
});

test('administrative completion confirmation distinguishes terminal follow-up retirement from proof', async ({
  page,
}) => {
  await installSimulatedFollowUpCompletionBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await page
    .getByRole('button', { name: 'Complete follow-up', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Complete owned follow-up' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveScreenshot('follow-up-completion.png');
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('follow-up-completion-narrow.png');
});

test('paired follow-up workspace keeps owned work first and reflows without overflow', async ({
  page,
}) => {
  const bff = await installSimulatedOwnedContextBff(page, {
    includeSharedWork: true,
  });
  await page.goto(supervisorTenantPath);
  const owned = page.getByRole('region', { name: 'Claimed follow-ups' });
  const shared = page.getByRole('region', { name: 'Open follow-up work' });
  await expect(
    owned.getByRole('button', { name: 'Open resolver console' }),
  ).toBeVisible();
  await expect(
    shared.getByText('Available to claim', { exact: true }),
  ).toBeVisible();
  await expect(owned.getByText('1 row on this page')).toBeVisible();
  await expect(shared.getByText('1 row on this page')).toBeVisible();
  const desktopOwned = await owned.boundingBox();
  const desktopShared = await shared.boundingBox();
  if (desktopOwned === null || desktopShared === null)
    throw new Error('Both work surfaces must be measurable.');
  expect(desktopShared.x).toBeGreaterThanOrEqual(
    desktopOwned.x + desktopOwned.width,
  );
  expect(desktopShared.y).toBe(desktopOwned.y);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('follow-up-workspace.png', {
    fullPage: true,
  });

  await page.setViewportSize({ width: 320, height: 812 });
  const narrowOwned = await owned.boundingBox();
  const narrowShared = await shared.boundingBox();
  if (narrowOwned === null || narrowShared === null)
    throw new Error('Both work surfaces must remain measurable.');
  expect(narrowShared.y).toBeGreaterThanOrEqual(
    narrowOwned.y + narrowOwned.height,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('follow-up-workspace-narrow.png', {
    fullPage: true,
  });
  expect(bff.summaryReads()).toBe(0);
  expect(bff.claimCommands()).toBe(0);
  expect(bff.ownedReads()).toBe(1);
});

test('empty follow-up views retain independent filters and page controls', async ({
  page,
}) => {
  await installSimulatedInboxBff(page);
  await page.goto(supervisorTenantPath + '?queue=no-such-queue');
  await expect(
    page.getByRole('heading', { name: 'No active claimed work in this view.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No open work in this view.' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Queue key' })).toHaveValue(
    'no-such-queue',
  );
  for (const name of ['Follow-up pages', 'Claimed follow-up pages']) {
    const paging = page.getByRole('navigation', { name, exact: true });
    await expect(paging.getByText('No rows on this page')).toBeVisible();
    for (const button of await paging.getByRole('button').all())
      await expect(button).toBeDisabled();
  }
  await expect(page).toHaveScreenshot('follow-up-workspace-empty.png', {
    fullPage: true,
  });
});

test('assigned chrome retains populated and withheld layout', async ({
  page,
}) => {
  const bff = await installSimulatedRunSupervisionBff(page);
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await expect(page.getByText('305.123456 ms', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('assigned-populated.png', {
    animations: 'disabled',
  });
  // Use settled protected absence, not a timed pending window, for stable pixels.
  // Existing shell tests separately assert immediate pending-state withdrawal.
  bff.setRunReadMode('not-found');
  await page.getByRole('button', { name: 'Recheck selected run' }).click();
  await expect(
    page.getByRole('heading', { name: 'Run context is unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByText('access-restoration', { exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot('assigned-withheld.png');
  expect(bff.consoleReads()).toBe(2);
  expect(bff.commands()).toBe(0);
});

test('recorded workspace separates pinned context, receipt and append history', async ({
  page,
}) => {
  // Allocate the full section before navigation; do not resize an active
  // scroll container or disturb the separate chrome/withdrawal baseline.
  await page.setViewportSize({ width: 1440, height: 1800 });
  const bff = await installSimulatedRunSupervisionBff(page);
  bff.setRunReadMode('projected');
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  const records = page.getByRole('region', { name: 'Recorded execution' });
  await expect(
    records
      .getByText('Snapshot revision', { exact: true })
      .locator('..')
      .getByRole('definition'),
  ).toHaveText('1');
  await expect(
    records.getByRole('heading', { name: '1 · Capability success projected' }),
  ).toBeVisible();
  await expect(records).toHaveScreenshot('execution-projected.png');
  expect(bff.consoleReads()).toBe(1);
  expect(bff.commands()).toBe(0);
});

test('authorization shows reviewed risk, scope and admission boundary before any write', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const bff = await installSimulatedRunExecutionBff(page);
  bff.setEnabled(true);
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  await page
    .getByRole('button', { name: 'Review execution or recovery', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Review pinned capability execution',
    exact: true,
  });
  await expect(
    dialog.getByRole('button', { name: 'Authorize and execute pinned action' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('complementary', {
      name: 'Irreversible admission · external effect',
    }),
  ).toBeVisible();
  await expect(dialog).toHaveScreenshot('authorization-review.png');
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include('dialog').analyze()).violations,
  ).toEqual([]);
  await expect(dialog).toHaveScreenshot('authorization-narrow.png');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', {
      name: 'Review execution or recovery',
      exact: true,
    }),
  ).toBeFocused();
  expect(bff.reviewReads()).toBe(1);
  expect(bff.intents()).toHaveLength(0);
  expect(bff.dispatches()).toBe(0);
});

test('pinned inputs show attributable history, not verified claims', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  const bff = await installSimulatedRunEvidenceBff(page);
  bff.setMode('populated');
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  const inputs = page.getByRole('region', {
    name: 'Case evidence',
    exact: true,
  });
  await expect(
    inputs.getByRole('note', { name: 'Pinned binding attribution' }),
  ).toHaveCount(2);
  await expect(inputs).toHaveScreenshot('pinned-evidence.png');
  expect(bff.reads()).toBe(1);
  expect(bff.commands()).toBe(0);
});

test('outcome separates mutable matching from durable acceptance and reflows narrowly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  const bff = await installSimulatedRunVerificationBff(page);
  bff.setMode('matching');
  await page.goto(supervisorTenantPath + '?view=runs');
  await page
    .getByRole('button', { name: 'Inspect run ' + assignedRunId })
    .click();
  const outcome = page.getByRole('region', {
    name: 'Outcome proof',
    exact: true,
  });
  await expect(
    outcome.getByText('Current assessment · not acceptance', { exact: true }),
  ).toBeVisible();
  await expect(outcome).toHaveScreenshot('outcome-matching.png');
  bff.setMode('accepted');
  await page.getByRole('button', { name: 'Recheck selected run' }).click();
  await expect(
    outcome.getByRole('region', { name: 'Durable acceptance record' }),
  ).toBeVisible();
  await expect(outcome).toHaveScreenshot('outcome-accepted.png');
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.getByRole('button', { name: 'Jump to outcome proof' }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(outcome).toHaveScreenshot('outcome-accepted-narrow.png');
  expect(bff.reads()).toBe(2);
  expect(bff.commands()).toBe(0);
});

test('owned chrome and inspection remain usable at narrow width and in forced colours', async ({
  page,
}) => {
  await installSimulatedOwnedContextBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Restore access to the customer workspace',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Compare sources' }).click();
  const dialog = page.getByRole('dialog', { name: 'Source comparison' });
  await expect(
    dialog.getByRole('heading', { name: 'Source comparison' }),
  ).toBeFocused();
  await expect(page).toHaveScreenshot('owned-inspection.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 812 });
  const presence = await page
    .getByRole('region', { name: 'Current claim' })
    .boundingBox();
  const back = await page
    .getByRole('button', { name: 'Back to active work' })
    .boundingBox();
  if (presence === null || back === null) {
    throw new Error('Owned Console chrome must have measurable bounds.');
  }
  expect(presence.y).toBeGreaterThanOrEqual(back.y + back.height);
  expect(presence.width).toBeGreaterThan(280);
  await expect(page).toHaveScreenshot('owned-narrow.png');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Compare sources' }).click();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => getComputedStyle(element).backdropFilter,
    ),
  ).toBe('none');
  await expect(page).toHaveScreenshot('inspection-forced-colours.png');
});
import {
  installSimulatedFollowUpNotesBff,
  historicalNote,
} from './guide/simulated-follow-up-notes-bff';

test('owned notes separate attributed commentary from evidence and reflow narrowly', async ({
  page,
}) => {
  await installSimulatedFollowUpNotesBff(page);
  await page.goto(supervisorTenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  await page
    .getByRole('button', { name: 'Internal notes', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Internal follow-up notes' });
  await expect(dialog.getByText(historicalNote.text)).toBeVisible();
  await expect(page).toHaveScreenshot('owned-notes.png');
  await page.setViewportSize({ width: 320, height: 812 });
  await expect(dialog).toHaveScreenshot('owned-notes-narrow.png');
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
