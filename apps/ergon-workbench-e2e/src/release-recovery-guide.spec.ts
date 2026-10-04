import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { releaseRecoveryGuide } from './guide/release-recovery-guide';
import { installSimulatedReleaseRecoveryBff } from './guide/simulated-release-recovery-bff';
import { runGuideScenario } from './guide/user-guide-session';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';

test(
  'distinguishes disabled release from exact replay of an uncertain release',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      releaseRecoveryGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedReleaseRecoveryBff(page);
        await page.goto(tenantPath);

        const shared = page.getByRole('region', {
          name: 'Open follow-up work',
        });
        const owned = page.getByRole('region', { name: 'Claimed follow-ups' });
        const ownedItem = owned.getByRole('heading', {
          level: 3,
          name: 'Retry attempt limit reached',
        });
        const openItem = shared.getByRole('heading', {
          level: 3,
          name: 'Retry attempt limit reached',
        });
        const release = owned.getByRole('button', {
          name: 'Release Retry attempt limit reached follow-up',
        });
        const confirm = owned.getByRole('button', {
          name: 'Confirm release',
        });

        await expect(ownedItem).toBeVisible();
        await expect(openItem).toHaveCount(0);
        await guide.result('owned-before-release', ownedItem);

        await guide.action('open-disabled-confirmation', release, () =>
          release.click(),
        );
        await expect(confirm).toBeVisible();
        await expect(
          owned.getByRole('button', { name: 'Cancel' }),
        ).toBeVisible();
        expect(bff.requests()).toHaveLength(0);
        await guide.result(
          'review-release-effect',
          owned.getByRole('group', {
            name: 'Release Retry attempt limit reached follow-up',
          }),
        );

        await guide.action('submit-disabled-release', confirm, () =>
          confirm.click(),
        );
        const unavailable = owned.getByRole('alert', {
          name: 'Releasing work is not enabled.',
        });
        await expect(unavailable).toBeVisible();
        await expect(ownedItem).toBeVisible();
        await expect(
          owned.getByRole('button', { name: 'Try release again' }),
        ).toHaveCount(0);
        expect(bff.requests()).toHaveLength(1);
        await guide.result('recognize-disabled-release', unavailable);

        await guide.action('compare-enabled-rollout', unavailable, async () => {
          // This changes only the synthetic deployment state, not UI settings.
          bff.enableRelease();
          await page.reload();
        });
        await expect(ownedItem).toBeVisible();
        await expect(unavailable).toHaveCount(0);
        expect(bff.requests()).toHaveLength(1);

        await guide.action('open-enabled-confirmation', release, () =>
          release.click(),
        );
        await expect(confirm).toBeVisible();
        await guide.action('submit-uncertain-release', confirm, () =>
          confirm.click(),
        );
        const uncertain = owned.getByRole('alert', {
          name: 'The release result is not yet known.',
        });
        await expect(uncertain).toBeVisible();
        await expect(
          owned.getByRole('status', { name: 'Follow-up released' }),
        ).toHaveCount(0);
        expect(bff.requests()).toHaveLength(2);
        await guide.result('recognize-release-uncertainty', uncertain);

        const retry = owned.getByRole('button', { name: 'Try release again' });
        await guide.action('retry-exact-release', retry, () => retry.click());
        expect(bff.requests()).toHaveLength(3);
        expect(bff.requests()[2]).toEqual(bff.requests()[1]);
        const success = owned.getByRole('status', {
          name: 'Follow-up released',
        });
        await expect(success).toBeVisible();
        await expect(ownedItem).toHaveCount(0);
        await guide.result('confirm-release-receipt', success);

        await expect(openItem).toBeVisible();
        await expect(shared.getByText('access-restoration')).toBeVisible();
        await expect(
          owned.getByRole('heading', {
            level: 3,
            name: 'No active claimed work in this view.',
          }),
        ).toBeVisible();
        // Center the returned card so its queue and status remain readable in
        // the recorded image instead of clipping at the viewport edge.
        await openItem.evaluate((element) =>
          element.scrollIntoView({ block: 'center' }),
        );
        await guide.result('verify-returned-work', openItem);

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);
