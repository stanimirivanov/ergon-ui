import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { claimRecoveryGuide } from './guide/claim-recovery-guide';
import { installSimulatedClaimRecoveryBff } from './guide/simulated-claim-recovery-bff';
import { runGuideScenario } from './guide/user-guide-session';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';

test(
  'distinguishes a competing claim from exact replay of an uncertain claim',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      claimRecoveryGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedClaimRecoveryBff(page);
        await page.goto(tenantPath);

        const shared = page.getByRole('region', {
          name: 'Open follow-up work',
        });
        const owned = page.getByRole('region', { name: 'Claimed follow-ups' });
        const retryLimit = shared.getByRole('heading', {
          level: 3,
          name: 'Retry attempt limit reached',
        });
        const openManualReview = shared.getByRole('heading', {
          level: 3,
          name: 'Manual review required',
        });
        const ownedManualReview = owned.getByRole('heading', {
          level: 3,
          name: 'Manual review required',
        });

        await expect(retryLimit).toBeVisible();
        await expect(openManualReview).toBeVisible();
        await expect(
          owned.getByRole('heading', {
            level: 3,
            name: 'No active claimed work in this view.',
          }),
        ).toBeVisible();
        await guide.result('two-open-items', retryLimit);

        const compete = shared.getByRole('button', {
          name: 'Claim Retry attempt limit reached follow-up',
        });
        await guide.action('attempt-competed-claim', compete, () =>
          compete.click(),
        );
        const conflict = shared.getByRole('alert', {
          name: 'Another resolver claimed this work.',
        });
        await expect(conflict).toBeVisible();
        await expect(retryLimit).toHaveCount(0);
        await expect(openManualReview).toBeVisible();
        await expect(
          shared.getByRole('button', { name: 'Try claim again' }),
        ).toHaveCount(0);
        await guide.result('recognize-conflict', conflict);

        const claimManualReview = shared.getByRole('button', {
          name: 'Claim Manual review required follow-up',
        });
        await guide.action('attempt-uncertain-claim', claimManualReview, () =>
          claimManualReview.click(),
        );
        const uncertain = shared.getByRole('alert', {
          name: 'The claim result is not yet known.',
        });
        await expect(uncertain).toBeVisible();
        await expect(ownedManualReview).toHaveCount(0);
        // Keep the retry control clear of the recording annotation so the
        // screenshot shows the action a resolver should actually choose.
        await uncertain.evaluate((element) =>
          element.scrollIntoView({ block: 'center' }),
        );
        await guide.result('recognize-uncertainty', uncertain);

        const retry = shared.getByRole('button', {
          name: 'Try claim again',
        });
        await guide.action('retry-original-command', retry, () =>
          retry.click(),
        );
        const requests = bff.requests();
        expect(requests).toHaveLength(3);
        expect(requests[0]?.workItemId).toBe(
          '11111111-1111-4111-8111-111111111111',
        );
        expect(requests[1]?.workItemId).toBe(
          '55555555-5555-4555-8555-555555555555',
        );
        expect(requests[2]).toEqual(requests[1]);

        const success = shared.getByRole('status', {
          name: 'Follow-up claimed',
        });
        await expect(success).toBeVisible();
        await expect(openManualReview).toHaveCount(0);
        await guide.result('confirm-recorded-claim', success);

        await expect(ownedManualReview).toBeVisible();
        await expect(
          owned.getByText('66666666-6666-4666-8666-666666666666'),
        ).toBeVisible();
        await guide.result('verify-active-work', ownedManualReview);

        await page.reload();
        await expect(ownedManualReview).toBeVisible();
        await expect(
          shared.getByRole('heading', {
            level: 3,
            name: 'No open work in this view.',
          }),
        ).toBeVisible();
        expect(bff.requests()).toHaveLength(3);
        await guide.result('reload-owned-work', ownedManualReview);

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);
