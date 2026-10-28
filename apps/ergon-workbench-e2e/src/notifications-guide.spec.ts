import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser } from '@playwright/test';
import type { GuideChapter } from './guide/guide-chapter';
import { resolverNotificationsGuide } from './guide/resolver-notifications-guide';
import { requesterNotificationsGuide } from './guide/requester-notifications-guide';
import {
  installSimulatedNotificationsBff,
  notificationTarget,
  notificationTenant,
} from './guide/simulated-notifications-bff';
import { runGuideScenario } from './guide/user-guide-session';

test('notification fixture denies the exact requester progress resource', async ({
  page,
}) => {
  const bff = await installSimulatedNotificationsBff(page, 'requester');
  await page.goto('http://localhost:4301/');
  const result = await page.evaluate(async (path) => {
    const response = await fetch(path);
    const body: unknown = await response.json();
    return {
      status: response.status,
      fixture: response.headers.get('x-ergon-guide-fixture'),
      body,
    };
  }, `/bff/v1/tenants/${notificationTenant}/requester-cases/${notificationTarget}/progress`);
  expect(result).toEqual({
    status: 404,
    fixture: 'simulated-bff',
    body: { type: 'urn:ergon:problem:requester-case-not-found' },
  });
  expect(bff.targets()).toBe(1);
});

async function recordNotifications(
  browser: Browser,
  audience: 'requester' | 'resolver',
  chapter: GuideChapter,
): Promise<number> {
  let targetReads = 0;
  const origin =
    audience === 'requester'
      ? 'http://localhost:4301'
      : 'http://localhost:4300';
  await runGuideScenario(browser, origin, chapter, async (guide) => {
    const page = guide.page;
    const bff = await installSimulatedNotificationsBff(page, audience);
    const path = '/tenants/' + notificationTenant + '/notifications';
    await page.goto(path);
    const targetName = `Check current access to ${audience === 'requester' ? 'case' : 'work'} ${notificationTarget}`;
    const target = page.getByRole('button', { name: targetName, exact: true });
    await expect(target).toBeVisible();
    await expect(page.getByText(/PRIVATE-/)).toHaveCount(0);
    if (audience === 'resolver')
      await expect(
        page.getByRole('heading', { name: 'Work handed over', exact: true }),
      ).toHaveCount(2);
    await guide.result(
      audience + '-deliveries',
      page.getByRole('region', { name: 'Recent deliveries' }),
    );
    await page.setViewportSize({ width: 320, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await guide.result(audience + '-narrow', target);
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessions = bff.sessions();
    await guide.action(audience + '-target', target, async () => {
      await target.click();
      if (audience === 'resolver')
        await expect(page.getByRole('alert')).toBeVisible();
      else
        await expect(
          page.getByRole('heading', { name: 'Case progress is unavailable.' }),
        ).toBeVisible();
    });
    expect(bff.sessions()).toBeGreaterThan(sessions);
    targetReads = bff.targets();
    await expect(
      page.getByRole('heading', { name: 'Recent deliveries' }),
    ).toHaveCount(0);
    if (audience === 'resolver') {
      await expect(page).toHaveURL(origin + path);
      await expect(
        page.getByRole('heading', { name: 'Notifications', exact: true }),
      ).toBeFocused();
      await page.getByRole('button', { name: 'Back to notifications' }).click();
    } else {
      await expect(page).toHaveURL(
        origin +
          '/tenants/' +
          notificationTenant +
          '/cases/' +
          notificationTarget,
      );
      await page
        .getByRole('link', { name: 'Notifications', exact: true })
        .click();
    }
    await expect(target).toBeVisible();
    const recheck = page.getByRole('button', { name: 'Recheck notifications' });
    bff.mode('forbidden');
    await recheck.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('not an empty feed');
    await expect(target).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Notifications', exact: true }),
    ).toBeFocused();
    await guide.result(audience + '-denial', page.getByRole('alert'));
    for (const [mode, copy] of [
      ['unavailable', 'temporarily unavailable'],
      ['malformed', 'could not be validated'],
      ['sign-in', 'session must be renewed'],
    ] as const) {
      bff.mode(mode);
      await recheck.click();
      await expect(page.getByRole('alert')).toContainText(copy);
      await expect(target).toHaveCount(0);
    }
    await expect(
      page.getByRole('link', { name: 'Sign in again' }),
    ).toHaveAttribute(
      'href',
      `/bff/login?returnTo=%2Ftenants%2F${notificationTenant}`,
    );
    bff.mode('populated');
    await recheck.click();
    await expect(target).toBeVisible();
    await guide.result(
      audience + '-recovery',
      page.getByRole('region', { name: 'Recent deliveries' }),
    );
    bff.mode('empty');
    await recheck.click();
    const empty = page.getByText(/No recent deliveries in this checked feed/);
    await expect(empty).toBeVisible();
    await expect(target).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    await guide.result(audience + '-empty', empty);
  });
  return targetReads;
}

test(
  'checks resolver notification targets without restoring historical authority',
  { tag: '@user-guide' },
  async ({ browser }) => {
    expect(
      await recordNotifications(
        browser,
        'resolver',
        resolverNotificationsGuide,
      ),
    ).toBe(1);
  },
);
test(
  'checks requester notification targets through fresh supplied-case access',
  { tag: '@user-guide' },
  async ({ browser }) => {
    expect(
      await recordNotifications(
        browser,
        'requester',
        requesterNotificationsGuide,
      ),
    ).toBe(1);
  },
);
