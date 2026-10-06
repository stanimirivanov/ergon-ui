import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ownedContextGuide } from './guide/owned-context-guide';
import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';
import { runGuideScenario } from './guide/user-guide-session';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const caseGoal = 'Restore access to the customer workspace';
const observation = 'The sign-in link returns an expired-token message.';
const laterObservation =
  'A later SSO check reported a disabled browser session.';

test(
  'recovers owned work and hides case evidence during failed revalidation',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      ownedContextGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedOwnedContextBff(page);
        await page.goto(tenantPath);

        const owned = page.getByRole('region', { name: 'Claimed follow-ups' });
        const ownedItem = owned.getByRole('heading', {
          level: 3,
          name: 'Retry attempt limit reached',
        });
        const openConsole = owned.getByRole('button', {
          name: 'Open resolver console',
        });
        const consoleView = page.getByRole('region', {
          name: 'Resolver Console',
        });
        const caseHeading = consoleView.getByRole('heading', {
          level: 2,
          name: caseGoal,
        });

        await expect(ownedItem).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        expect(bff.summaryReads()).toBe(0);
        await guide.result('owned-work-on-entry', ownedItem);

        await guide.action('reload-workbench', ownedItem, async () => {
          await page.reload();
        });
        await expect(ownedItem).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        expect(bff.summaryReads()).toBe(0);
        expect(bff.claimCommands()).toBe(0);
        await guide.result('owned-work-restored', ownedItem);

        await guide.action('open-case-context', openConsole, () =>
          openConsole.click(),
        );
        await expect(consoleView).toBeVisible();
        await expect(caseHeading).toBeVisible();
        const evidence = consoleView.getByRole('region', {
          name: 'Recorded observations',
        });
        const observationList = evidence.getByRole('list', {
          name: 'Case observations',
        });
        const firstObservation = observationList.getByRole('button', {
          name: 'Inspect observation: Customer cannot sign in',
        });
        const laterObservationButton = observationList.getByRole('button', {
          name: 'Inspect observation: Later SSO diagnostic received',
        });
        const detail = evidence.getByRole('region', {
          name: 'Source observation details',
        });
        await expect(observationList.getByRole('listitem')).toHaveCount(2);
        await expect(firstObservation).toHaveAttribute('aria-pressed', 'true');
        await expect(detail.getByText(observation)).toBeVisible();
        await expect(
          detail.getByText('In this run’s evidence snapshot'),
        ).toBeVisible();
        await expect(
          consoleView.getByRole('heading', {
            level: 4,
            name: 'Automation handoff',
          }),
        ).toBeVisible();
        expect(bff.summaryReads()).toBe(1);
        await guide.result('review-evidence', caseHeading);
        await guide.result('inspect-source-observation', detail);

        await guide.action(
          'select-later-observation',
          laterObservationButton,
          () => laterObservationButton.click(),
        );
        await expect(laterObservationButton).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        await expect(firstObservation).toHaveAttribute('aria-pressed', 'false');
        await expect(detail.getByText(laterObservation)).toBeVisible();
        await expect(detail.getByText(observation)).toHaveCount(0);
        await expect(
          detail.getByText('Recorded after this run’s evidence snapshot'),
        ).toBeVisible();
        await expect(
          detail.getByRole('heading', {
            name: 'Source observation details',
          }),
        ).toBeFocused();
        expect(bff.summaryReads()).toBe(1);
        // Annotate the pane header so the callout does not cover provenance.
        await guide.result(
          'inspect-later-observation',
          evidence.getByRole('heading', { name: 'Recorded observations' }),
        );

        const backToObservations = detail.getByRole('button', {
          name: 'Back to observations',
        });
        await guide.action('return-to-observations', backToObservations, () =>
          backToObservations.click(),
        );
        await expect(laterObservationButton).toBeFocused();
        await expect(detail.getByText(laterObservation)).toBeVisible();
        await guide.action(
          'select-run-snapshot-observation',
          firstObservation,
          () => firstObservation.click(),
        );
        await expect(firstObservation).toHaveAttribute('aria-pressed', 'true');
        await expect(detail.getByText(observation)).toBeVisible();
        expect(bff.summaryReads()).toBe(1);

        const context = consoleView.getByRole('region', { name: caseGoal });
        const attempts = context.getByRole('list', {
          name: 'Resolution attempts',
        });
        const proof = context.getByRole('region', { name: 'Not assessed' });
        const attemptRows = attempts.locator(':scope > li');
        await expect(attemptRows).toHaveCount(2);
        await expect(attemptRows.nth(0)).toContainText(
          'Attempt 1 · SUPERSEDED',
        );
        await expect(attemptRows.nth(1)).toContainText('Attempt 2 · ESCALATED');
        await expect(
          proof.getByText(/account\.access\.state\s*=\s*ACTIVE/u),
        ).toBeVisible();
        await expect(proof).toContainText(
          'there is no accepted proof of resolution',
        );
        await guide.result('inspect-attempt-history', attempts);

        const firstRecord = attemptRows.nth(0).locator('summary');
        await guide.action('open-attempt-record', firstRecord, async () => {
          await firstRecord.focus();
          await page.keyboard.press('Enter');
        });
        await expect(attemptRows.nth(0).locator('details')).toHaveAttribute(
          'open',
          '',
        );
        const firstEvents = attemptRows.nth(0).getByRole('list', {
          name: 'Recorded events for attempt 1',
        });
        await expect(firstEvents.getByRole('listitem')).toHaveCount(2);
        await expect(firstEvents).toContainText(
          'READY_FOR_AUTHORIZATION → ACTION_FAILED',
        );
        await expect(firstEvents).toContainText(
          '33333333-3333-4333-8333-333333333333',
        );
        const secondRecord = attemptRows.nth(1).locator('summary');
        await secondRecord.focus();
        await page.keyboard.press('Space');
        await expect(attemptRows.nth(1).locator('details')).toHaveAttribute(
          'open',
          '',
        );
        const secondEvents = attemptRows.nth(1).getByRole('list', {
          name: 'Recorded events for attempt 2',
        });
        await expect(secondEvents.getByRole('listitem')).toHaveCount(1);
        await expect(secondEvents).not.toContainText('retry started successor');
        await expect(attemptRows.nth(1)).toContainText(
          '55555555-5555-4555-8555-555555555555',
        );
        expect(bff.summaryReads()).toBe(1);
        await guide.result('inspect-recorded-events', firstEvents);
        await guide.result('inspect-proof', proof);

        const backToWork = consoleView.getByRole('button', {
          name: 'Back to active work',
        });
        await guide.action('hide-case-context', backToWork, () =>
          backToWork.click(),
        );
        await expect(consoleView).toHaveCount(0);
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await expect(detail).toHaveCount(0);
        await guide.result('context-hidden', openConsole);

        await guide.action('reopen-case-context', openConsole, () =>
          openConsole.click(),
        );
        await expect.poll(() => bff.summaryReads()).toBe(2);
        const loading = consoleView.getByRole('heading', {
          level: 2,
          name: 'Loading case context…',
        });
        await expect(loading).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await expect(detail).toHaveCount(0);
        await guide.result('evidence-hidden-while-loading', loading);

        bff.denyPendingSummary();
        const unavailable = consoleView.getByRole('heading', {
          level: 2,
          name: 'Case context is no longer available.',
        });
        await expect(unavailable).toBeVisible();
        await expect(caseHeading).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        await expect(detail).toHaveCount(0);
        await expect(
          consoleView.getByRole('button', { name: 'Try case context again' }),
        ).toHaveCount(0);
        await guide.result('context-unavailable', unavailable);

        const deniedAccessibility = await new AxeBuilder({ page }).analyze();
        expect(deniedAccessibility.violations).toEqual([]);

        await guide.action('reload-active-work', unavailable, async () => {
          await page.reload();
        });
        const empty = owned.getByRole('heading', {
          level: 3,
          name: 'No active claimed work in this view.',
        });
        await expect(empty).toBeVisible();
        await expect(ownedItem).toHaveCount(0);
        await expect(page.getByText(observation)).toHaveCount(0);
        expect(bff.summaryReads()).toBe(2);
        expect(bff.ownedReads()).toBeGreaterThanOrEqual(3);
        expect(bff.claimCommands()).toBe(0);
        await guide.result('owned-work-empty', empty);
      },
    ),
);

test('places console panes in order without overflow at desktop and narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bff = await installSimulatedOwnedContextBff(page);
  await page.goto(tenantPath);
  await page.getByRole('button', { name: 'Open resolver console' }).click();

  const consoleView = page.getByRole('region', { name: 'Resolver Console' });
  const context = consoleView.getByRole('region', { name: caseGoal });
  const evidence = context.getByRole('region', {
    name: 'Recorded observations',
  });
  const observationList = evidence.getByRole('list', {
    name: 'Case observations',
  });
  const detail = evidence.getByRole('region', {
    name: 'Source observation details',
  });
  const attempts = context.getByRole('region', { name: 'Recorded attempts' });
  const handoff = attempts.getByRole('region', { name: 'Automation handoff' });
  const contract = context.getByRole('region', { name: 'Case and contract' });
  const proof = context.getByRole('region', { name: 'Not assessed' });
  await expect(evidence).toBeVisible();
  await expect(detail).toBeVisible();
  await expect(handoff).toBeVisible();
  await expect(attempts).toBeVisible();
  await expect(proof).toBeVisible();
  await expect(contract).toBeVisible();
  await expect(
    consoleView.getByText('not a live tool trace', {
      exact: false,
    }),
  ).toBeVisible();
  const desktopEvidence = await evidence.boundingBox();
  const desktopAttempts = await attempts.boundingBox();
  const desktopProof = await proof.boundingBox();
  if (
    desktopEvidence === null ||
    desktopAttempts === null ||
    desktopProof === null
  ) {
    throw new Error('Case inspection regions have no desktop bounds');
  }
  expect(desktopEvidence.x + desktopEvidence.width).toBeLessThan(
    desktopAttempts.x,
  );
  expect(desktopAttempts.x + desktopAttempts.width).toBeLessThan(
    desktopProof.x,
  );

  await page.setViewportSize({ width: 375, height: 812 });
  const narrowEvidence = await evidence.boundingBox();
  const narrowAttempts = await attempts.boundingBox();
  const narrowProof = await proof.boundingBox();
  const narrowHandoff = await handoff.boundingBox();
  const narrowContract = await contract.boundingBox();
  if (
    narrowEvidence === null ||
    narrowHandoff === null ||
    narrowAttempts === null ||
    narrowProof === null ||
    narrowContract === null
  ) {
    throw new Error('Case inspection regions have no narrow viewport bounds');
  }
  expect(narrowEvidence.y + narrowEvidence.height).toBeLessThan(
    narrowAttempts.y,
  );
  expect(narrowHandoff.y + narrowHandoff.height).toBeLessThan(narrowProof.y);
  expect(narrowAttempts.y + narrowAttempts.height).toBeLessThan(narrowProof.y);
  expect(narrowContract.y).toBeGreaterThan(narrowProof.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const attemptRows = attempts
    .getByRole('list', { name: 'Resolution attempts' })
    .locator(':scope > li');
  await attemptRows.nth(0).locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(attemptRows.nth(0).locator('details')).toHaveAttribute(
    'open',
    '',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const laterObservationButton = observationList.getByRole('button', {
    name: 'Inspect observation: Later SSO diagnostic received',
  });
  await laterObservationButton.focus();
  await page.keyboard.press('Enter');
  await expect(detail.getByText(laterObservation)).toBeVisible();
  await expect(
    detail.getByRole('heading', { name: 'Source observation details' }),
  ).toBeFocused();
  expect(bff.summaryReads()).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await detail.getByRole('button', { name: 'Back to observations' }).focus();
  await page.keyboard.press('Space');
  await expect(laterObservationButton).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await consoleView
    .getByRole('button', { name: 'Release to shared queue' })
    .click();
  const confirmation = consoleView.getByRole('group', {
    name: 'Confirm release to shared queue',
  });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByText('It does not complete the case', {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const confirmationAccessibility = await new AxeBuilder({ page }).analyze();
  expect(confirmationAccessibility.violations).toEqual([]);
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    consoleView.getByRole('button', { name: 'Release to shared queue' }),
  ).toBeFocused();
});
