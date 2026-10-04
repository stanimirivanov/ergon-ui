import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { inboxGuide } from './guide/inbox-guide';
import { installSimulatedInboxBff } from './guide/simulated-inbox-bff';
import { runGuideScenario } from './guide/user-guide-session';

const tenantPath = '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';

test(
  'navigates and filters the synthetic shared inbox without implying authority',
  { tag: '@user-guide' },
  async ({ browser, baseURL }) =>
    runGuideScenario(
      browser,
      baseURL ?? 'http://localhost:4300',
      inboxGuide,
      async (guide) => {
        const page = guide.page;
        const bff = await installSimulatedInboxBff(page);
        await page.goto(tenantPath);
        const inbox = page.getByRole('region', { name: 'Open follow-up work' });
        const rows = inbox
          .getByRole('list', { name: 'Open human follow-ups' })
          .locator('li');
        const next = inbox.getByRole('button', { name: 'Next page' });
        const previous = inbox.getByRole('button', { name: 'Previous page' });
        const queue = inbox.getByRole('textbox', { name: 'Queue key' });
        const apply = inbox.getByRole('button', { name: 'Apply filter' });

        await expect(page.getByText('workforce-sso')).toBeVisible();
        await expect(rows).toHaveCount(25);
        await expect(inbox.getByText('25 rows on this page')).toBeVisible();
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();
        await guide.result(
          'first-page',
          inbox.getByRole('heading', { name: 'Retry attempt limit reached' }),
        );

        await guide.action('next-page', next, () => next.click());
        await expect(rows).toHaveCount(1);
        await expect(
          inbox.getByRole('heading', { name: 'Identity review needed' }),
        ).toBeVisible();
        await expect(inbox.getByText('1 row on this page')).toBeVisible();
        await expect(previous).toBeEnabled();
        await expect(next).toBeDisabled();
        expect(
          bff.inboxRequests().some((query) => {
            const params = new URLSearchParams(query);
            return (
              params.get('afterOpenedAt') === '2026-09-21T09:24:00Z' &&
              params.get('afterWorkItemId') ===
                '10000000-0000-4000-8000-000000000025'
            );
          }),
        ).toBe(true);
        await guide.result(
          'second-page',
          inbox.getByText('1 row on this page'),
        );

        await guide.action('previous-page', previous, () => previous.click());
        await expect(rows).toHaveCount(25);
        await expect(inbox.getByText('25 rows on this page')).toBeVisible();

        await guide.action('filter-queue', queue, async () => {
          await queue.fill('access-restoration');
          await apply.click();
        });
        await expect(page).toHaveURL(/\?queue=access-restoration$/u);
        await expect(rows).toHaveCount(1);
        await expect(
          inbox.getByRole('heading', { name: 'Retry attempt limit reached' }),
        ).toBeVisible();
        expect(
          bff
            .inboxRequests()
            .some(
              (query) =>
                new URLSearchParams(query).get('queueKey') ===
                'access-restoration',
            ),
        ).toBe(true);
        await expect(previous).toBeDisabled();
        await expect(next).toBeDisabled();
        await guide.result(
          'filtered-page',
          inbox.getByText('1 row on this page'),
        );

        await guide.action('unknown-queue', queue, async () => {
          await queue.fill('no-such-queue');
          await apply.click();
        });
        await expect(page).toHaveURL(/\?queue=no-such-queue$/u);
        await expect(
          inbox.getByRole('heading', { name: 'No open work in this view.' }),
        ).toBeVisible();
        await expect(inbox.getByText('No rows on this page')).toBeVisible();
        expect(
          bff
            .inboxRequests()
            .some(
              (query) =>
                new URLSearchParams(query).get('queueKey') === 'no-such-queue',
            ),
        ).toBe(true);
        await guide.result(
          'empty-queue-result',
          inbox.getByRole('heading', { name: 'No open work in this view.' }),
        );

        await guide.action('clear-filter', queue, async () => {
          await queue.fill('');
          await apply.click();
        });
        await expect(page).toHaveURL(new RegExp(`${tenantPath}$`, 'u'));
        await expect(rows).toHaveCount(25);
        await expect(inbox.getByText('25 rows on this page')).toBeVisible();
        await expect(previous).toBeDisabled();
        await guide.result(
          'all-queues-restored',
          inbox.getByRole('heading', { name: 'Retry attempt limit reached' }),
        );

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
      },
    ),
);
