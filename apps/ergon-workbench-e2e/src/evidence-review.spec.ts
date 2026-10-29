import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tenant = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const extraction = '55555555-5555-4555-8555-555555555555';
const quote = '<img src=x onerror=alert(1)> Documentary access 😀';
async function install(page: Page, kind: 'CLAIM' | 'PROCEDURE' = 'CLAIM') {
  let decision: 'ACCEPTED' | 'REJECTED' | null = null;
  let attempts = 0;
  let sessions = 0;
  let denied = false;
  const writes: { url: string; body: unknown }[] = [];
  const entry = {
    kind,
    id,
    sourceId: '44444444-4444-4444-8444-444444444444',
    digest: 'a'.repeat(64),
    extractionId: extraction,
    compilerRevision: 'commonmark-0.24.0-v1',
    proposedBy: actor,
    recordedAt: '2026-10-29T12:00:00Z',
    label: 'Recovery documentation',
    status: 'PROPOSED',
    version: 0,
  };
  let receipt: unknown = null;
  await page.route('**/bff/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/session')) {
      sessions++;
      await route.fulfill({
        json: {
          actorId: actor,
          identityProvider: 'workbench-sso',
          registeredAt: entry.recordedAt,
          recordedAt: entry.recordedAt,
        },
      });
      return;
    }
    if (path === '/bff/v1/csrf') {
      await route.fulfill({
        json: { headerName: 'X-CSRF-TOKEN', token: 'private-test-token' },
      });
      return;
    }
    if (denied) {
      await route.fulfill({ status: 404, json: {} });
      return;
    }
    if (path.endsWith('/pending')) {
      expect(new URL(request.url()).searchParams.get('limit')).toBe('20');
      await route.fulfill({
        json: { entries: decision === null ? [entry] : [], next: null },
      });
      return;
    }
    if (request.method() === 'POST') {
      attempts++;
      writes.push({
        url: request.url(),
        body: request.postDataJSON() as unknown,
      });
      const input = request.postDataJSON() as {
        decision: 'ACCEPTED' | 'REJECTED';
        rationale: string;
        extractionId: string;
        expectedVersion: number;
      };
      expect(request.headers()['x-csrf-token']).toBe('private-test-token');
      expect(input.extractionId).toBe(extraction);
      expect(input.expectedVersion).toBe(0);
      if (attempts === 1) {
        await route.fulfill({ status: 503, json: {} });
        return;
      }
      decision = input.decision;
      receipt = {
        target: { kind, id },
        commandId: path.split('/').at(-1),
        extractionId: extraction,
        version: 1,
        decision,
        rationale: input.rationale,
        reviewerId: actor,
        authorityEvidenceId: 'STRIP-PRIVATE-PROOF',
        reviewedAt: entry.recordedAt,
      };
      await route.fulfill({ status: 201, json: receipt });
      return;
    }
    if (path.endsWith('/review')) {
      const status = decision ?? 'PROPOSED';
      const citation = {
        sourceId: entry.sourceId,
        digest: entry.digest,
        start: 0,
        endExclusive: Array.from(quote).length,
        quote,
      };
      await route.fulfill({
        json: {
          target: { kind, id },
          status,
          version: decision === null ? 0 : 1,
          review: receipt,
          claim:
            kind === 'CLAIM'
              ? {
                  id,
                  input: {
                    extractionId: extraction,
                    observationIndex: 0,
                    property: 'documentation.access.restoration.supported',
                    subject: 'recovery',
                    scope: 'staff',
                    booleanValue: true,
                    textValue: null,
                    validFrom: null,
                    validUntil: null,
                  },
                  start: 0,
                  endExclusive: citation.endExclusive,
                  quote,
                  compilerRevision: entry.compilerRevision,
                  proposedBy: actor,
                  recordedAt: entry.recordedAt,
                  status,
                  bindingRule: 'manual-claim-v1',
                }
              : null,
          procedure:
            kind === 'PROCEDURE'
              ? {
                  id,
                  title: 'Recovery procedure',
                  extractionId: extraction,
                  compilerRevision: entry.compilerRevision,
                  observationIndex: 0,
                  citation,
                  steps: [{ position: 1, citation, operation: null }],
                  proposedBy: actor,
                  recordedAt: entry.recordedAt,
                  status,
                  bindingRule: 'ordered-list-procedure-v1',
                }
              : null,
        },
      });
      return;
    }
    throw new Error('Unexpected simulated route: ' + path);
  });
  return {
    writes,
    sessions: () => sessions,
    deny: () => {
      denied = true;
    },
  };
}
test('keyboard review preserves exact uncertain intent, renders inert source text and rechecks private access', async ({
  page,
}, testInfo) => {
  const bff = await install(page);
  await page.goto('/tenants/' + tenant + '/evidence');
  const inspect = page.getByRole('button', { name: 'Inspect claim' });
  await expect(inspect).toBeVisible();
  const sessions = bff.sessions();
  await inspect.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(quote, { exact: true })).toBeVisible();
  expect(bff.sessions()).toBeGreaterThan(sessions);
  await expect(
    page.getByRole('heading', { name: 'Evidence review', exact: true }),
  ).toBeFocused();
  await expect(page.locator('img[src=x]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('evidence-review-narrow.png'),
    fullPage: true,
  });

  await page
    .getByRole('textbox', { name: 'Rationale' })
    .fill('Verified exact original quotation');
  await page.getByRole('button', { name: 'Confirm review' }).click();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Retry exact review' }),
  ).toBeVisible();
  expect(bff.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Retry exact review' }).click();
  await expect(
    page.getByText('No further review is permitted for this proposal.'),
  ).toBeVisible();
  expect(bff.writes[1]).toEqual(bff.writes[0]);
  bff.deny();
  await page
    .getByRole('button', { name: 'Recheck current access', exact: true })
    .click();
  await expect(
    page.getByText('Evidence is not currently available to this session.'),
  ).toBeVisible();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
});
test('procedure inspection preserves source order and retires source content on queue navigation', async ({
  page,
}) => {
  await install(page, 'PROCEDURE');
  await page.goto('/tenants/' + tenant + '/evidence');
  await page.getByRole('button', { name: 'Inspect procedure' }).click();
  await expect(
    page.getByRole('heading', { name: 'Recovery procedure' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Step 1', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No API operation linked.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to evidence queue' }).click();
  await expect(
    page.getByRole('button', { name: 'Inspect procedure' }),
  ).toBeVisible();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
});
