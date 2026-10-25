import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { requesterProgressGuide } from './guide/requester-progress-guide';
import { runGuideScenario } from './guide/user-guide-session';
import { fulfillSimulatedBff } from './guide/simulated-bff-response';

const origin = 'http://localhost:4301';
const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const caseId = '20000000-0000-4000-8000-000000000001';
const path = `/tenants/${tenant}/cases/${caseId}`;
const goal = 'Restore team workspace access';

test(
  'checks requester-only progress and withdraws it through failed revalidation',
  { tag: '@user-guide' },
  async ({ browser }) =>
    runGuideScenario(browser, origin, requesterProgressGuide, async (guide) => {
      const page = guide.page;
      let authenticated = false;
      let reads = 0;
      let release: () => void = () => undefined;
      let resolveCase = false;
      const unexpected: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (
          url.pathname.startsWith('/bff/') &&
          !url.pathname.endsWith('/session') &&
          !url.pathname.endsWith('/progress')
        )
          unexpected.push(url.pathname);
      });
      await page.route('**/bff/v1/tenants/*/session', (route) =>
        fulfillSimulatedBff(
          route,
          authenticated
            ? {
                actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
                identityProvider: 'requester-sso',
                registeredAt: '2026-10-25T00:00:00Z',
                recordedAt: '2026-10-25T00:00:00Z',
              }
            : {
                type: 'urn:ergon:problem:browser-authentication-required',
                title: 'Authentication required',
                detail: 'Sign in',
                status: 401,
                signInPath: '/bff/login',
              },
          authenticated ? 200 : 401,
        ),
      );
      await page.route(
        '**/bff/v1/tenants/*/requester-cases/*/progress',
        async (route) => {
          reads += 1;
          expect(route.request().method()).toBe('GET');
          expect(route.request().url()).toBe(
            `${origin}/bff/v1/tenants/${tenant}/requester-cases/${caseId}/progress`,
          );
          if (reads === 3) {
            await expect(page.getByText(goal, { exact: true })).toHaveCount(0);
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            await fulfillSimulatedBff(
              route,
              { type: 'urn:ergon:problem:requester-case-not-found' },
              404,
            );
            return;
          }
          await fulfillSimulatedBff(route, {
            caseId,
            goal,
            status: resolveCase ? 'VERIFIED_RESOLVED' : 'OPEN',
            openedAt: '2026-10-25T09:00:00Z',
            updatedAt: '2026-10-25T09:01:00Z',
          });
        },
      );
      await page.goto(path);
      await expect(
        page.getByRole('link', { name: 'Sign in to Ergon' }),
      ).toHaveAttribute('href', `/bff/login?returnTo=%2Ftenants%2F${tenant}`);
      expect(reads).toBe(0);
      await guide.result('requester-sign-in', page.getByRole('main'));
      authenticated = true;
      await page.goto(path);
      await expect(page.getByRole('heading', { name: goal })).toBeVisible();
      await expect(page.getByText('Open', { exact: true })).toBeVisible();
      const details = page.getByRole('complementary', {
        name: 'Request details',
      });
      await expect(details).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'What Ergon is checking' }),
      ).toBeVisible();
      // The desktop reference has a details rail, not a reordered mobile DOM.
      const goalBounds = await page
        .getByRole('heading', { name: goal })
        .boundingBox();
      const detailsBounds = await details.boundingBox();
      expect(
        goalBounds &&
          detailsBounds &&
          detailsBounds.x > goalBounds.x + goalBounds.width,
      ).toBeTruthy();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await expect(
        page.getByRole('button', { name: /claim|execute|approve|handover/i }),
      ).toHaveCount(0);
      await guide.result('requester-open', page.getByRole('main'));
      await page.setViewportSize({ width: 320, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      const narrowGoal = await page
        .getByRole('heading', { name: goal })
        .boundingBox();
      const narrowDetails = await details.boundingBox();
      expect(
        narrowGoal && narrowDetails && narrowDetails.y > narrowGoal.y,
      ).toBeTruthy();
      await page.emulateMedia({
        forcedColors: 'active',
        reducedMotion: 'reduce',
      });
      await expect(page.getByText('Open', { exact: true })).toBeVisible();
      await page.emulateMedia({
        forcedColors: 'none',
        reducedMotion: 'no-preference',
      });
      await page.getByRole('button', { name: 'Recheck progress' }).focus();
      await expect(
        page.getByRole('button', { name: 'Recheck progress' }),
      ).toBeFocused();
      await guide.result('requester-narrow', page.getByRole('main'));
      await guide.result('requester-details', details);
      await page.setViewportSize({ width: 1440, height: 900 });
      // Start an independent desktop disclosure rather than reuse the narrow
      // document's viewport/compositor state for the next recorded frame.
      await page.goto(path);
      await expect(page.getByRole('heading', { name: goal })).toBeVisible();
      await page.getByRole('button', { name: 'Recheck progress' }).click();
      await expect.poll(() => reads).toBe(3);
      await expect(
        page.getByRole('heading', { name: 'Case progress', exact: true }),
      ).toBeFocused();
      await expect(page.getByText(goal, { exact: true })).toHaveCount(0);
      await expect(details).toHaveCount(0);
      await expect(page.locator('time')).toHaveCount(0);
      // Reset after withdrawal and focus, not before them. The complete pending
      // panel is the capture target, so annotation scrolling retains the shell.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.getByRole('banner')).toBeInViewport({ ratio: 1 });
      await guide.result('requester-pending', page.getByRole('main'));
      release();
      await expect(
        page.getByRole('heading', { name: 'Case progress is unavailable.' }),
      ).toBeVisible();
      await expect(page.getByText(goal, { exact: true })).toHaveCount(0);
      await guide.result('requester-hidden', page.getByRole('main'));
      resolveCase = true;
      await page.getByRole('button', { name: 'Recheck progress' }).click();
      await expect(
        page.getByText('Verified resolved', { exact: true }),
      ).toBeVisible();
      await guide.result('requester-resolved', page.getByRole('main'));
      expect(unexpected).toEqual([]);
      expect(reads).toBe(4);
      expect(
        await page.evaluate(() => localStorage.length + sessionStorage.length),
      ).toBe(0);
    }),
);
