import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
const tenant = '11111111-1111-4111-8111-111111111111',
  actor = '22222222-2222-4222-8222-222222222222';
const anchor = '33333333-3333-4333-8333-333333333333',
  other = '77777777-7777-4777-8777-777777777777';
const source = '44444444-4444-4444-8444-444444444444',
  extraction = '55555555-5555-4555-8555-555555555555';
const review = '88888888-8888-4888-8888-888888888888',
  review2 = '99999999-9999-4999-8999-999999999999';
const quote = '<img src=x onerror=alert(1)> Recovery guidance 😀';
function assessment(
  mode:
    | 'CONFLICT'
    | 'UNDETERMINED'
    | 'NO_DETECTED_CONFLICT'
    | 'INSUFFICIENT_CANDIDATES' = 'CONFLICT',
) {
  return {
    algorithm: 'documentary-contradictions-v1',
    property: 'documentation.access.restoration.supported',
    subject: 'recovery',
    scope: 'staff',
    revision: 2,
    state: mode,
    hasUndetermined: mode === 'UNDETERMINED',
    candidates: (mode === 'INSUFFICIENT_CANDIDATES'
      ? [anchor]
      : [anchor, other]
    ).map((id, i) => ({
      id,
      reviewCommandId: i === 0 ? review : review2,
      sourceId: source,
      digest: 'a'.repeat(64),
      claim: {
        id,
        input: {
          extractionId: extraction,
          observationIndex: 0,
          property: 'documentation.access.restoration.supported',
          subject: 'recovery',
          scope: 'staff',
          booleanValue: mode === 'NO_DETECTED_CONFLICT' || i === 0,
          textValue: null,
          validFrom:
            mode === 'UNDETERMINED' || mode === 'INSUFFICIENT_CANDIDATES'
              ? null
              : '2026-10-29T12:00:00.000001Z',
          validUntil:
            mode === 'UNDETERMINED' || mode === 'INSUFFICIENT_CANDIDATES'
              ? null
              : '2026-10-29T12:00:00.000002Z',
        },
        start: 0,
        endExclusive: Array.from(quote).length,
        quote,
        compilerRevision: 'commonmark-0.24.0-v1',
        proposedBy: actor,
        recordedAt: '2026-10-29T12:00:00Z',
        status: 'ACCEPTED',
        bindingRule: 'manual-claim-v1',
      },
    })),
    findings:
      mode === 'INSUFFICIENT_CANDIDATES'
        ? []
        : [
            {
              left: anchor,
              right: other,
              comparison: mode === 'NO_DETECTED_CONFLICT' ? 'COMPATIBLE' : mode,
            },
          ],
  };
}
async function install(
  page: Page,
  mode: Parameters<typeof assessment>[0] = 'CONFLICT',
) {
  let sessions = 0,
    denied = false,
    stale = false,
    decisionCurrent = true,
    decision: unknown = null,
    bundle: unknown = null;
  const writes: { url: string; body: unknown }[] = [],
    publications: { url: string; body: unknown }[] = [];
  const data = assessment(mode);
  await page.route('**/bff/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path.endsWith('/session')) {
      sessions++;
      await route.fulfill({
        json: {
          actorId: actor,
          identityProvider: 'workbench-sso',
          registeredAt: '2026-10-29T12:00:00Z',
          recordedAt: '2026-10-29T12:00:00Z',
        },
      });
      return;
    }
    if (path.endsWith('/csrf')) {
      await route.fulfill({
        json: { headerName: 'X-CSRF-TOKEN', token: 'fresh-test-token' },
      });
      return;
    }
    if (denied) {
      await route.fulfill({ status: 404, json: {} });
      return;
    }
    if (path.endsWith('/pending')) {
      await route.fulfill({ json: { entries: [], next: null } });
      return;
    }
    if (path.includes('/claims/')) {
      await route.fulfill({ json: data });
      return;
    }
    if (path.includes('/adjudications/')) {
      if (request.method() === 'POST') {
        const input = request.postDataJSON() as {
          anchorId: string;
          choice: string;
          selectedClaimId: string | null;
          rationale: string;
        };
        expect(request.headers()['x-csrf-token']).toBe('fresh-test-token');
        writes.push({ url: request.url(), body: input });
        decision = {
          id: path.split('/').at(-1),
          anchorId: input.anchorId,
          choice: input.choice,
          selectedClaimId: input.selectedClaimId,
          rationale: input.rationale,
          reviewerId: actor,
          authorityEvidenceId: 'STRIP-PRIVATE-PROOF',
          adjudicatedAt: '2026-10-29T12:00:01Z',
          current: true,
          assessment: data,
        };
        if (writes.length === 1) {
          await route.fulfill({ status: 503, json: {} });
          return;
        }
      }
      const current =
        typeof decision === 'object' && decision !== null
          ? { ...decision, current: decisionCurrent }
          : {};
      await route.fulfill({ json: current });
      return;
    }
    if (path.includes('/evidence-bundles/')) {
      if (request.method() === 'POST') {
        const input = request.postDataJSON() as {
          claims: string[];
          procedures: string[];
          claimSets: {
            anchorId: string;
            revision: number;
            candidateIds: string[];
            adjudicationId: string | null;
          }[];
        };
        expect(request.headers()['x-csrf-token']).toBe('fresh-test-token');
        publications.push({ url: request.url(), body: input });
        if (stale) {
          decisionCurrent = false;
          await route.fulfill({ status: 409, json: {} });
          return;
        }
        const references = data.candidates.map((c, i) => ({
          kind: 'CLAIM',
          id: c.id,
          sourceId: source,
          digest: 'a'.repeat(64),
          extractionId: extraction,
          compilerRevision: c.claim.compilerRevision,
          reviewCommandId: c.reviewCommandId,
          selected: input.claims.includes(c.id),
        }));
        bundle = {
          id: path.split('/').at(-1),
          sha256: 'b'.repeat(64),
          publishedBy: actor,
          authorityEvidenceId: 'STRIP-PRIVATE-PROOF',
          recordedAt: '2026-10-29T12:00:03Z',
          manifest: {
            schema: 'ergon.dev/evidence-bundle/v1',
            tenantId: tenant,
            assessedAt: '2026-10-29T12:00:02Z',
            proposals: references,
            sources: [{ sourceId: source, digest: 'a'.repeat(64) }],
            claimSets: [
              {
                property: 'SUPPORT',
                subject: data.subject,
                scope: data.scope,
                revision: 2,
                candidateIds: data.candidates.map((c) => c.id),
                reviewCommandIds: data.candidates.map((c) => c.reviewCommandId),
                findingCodes: data.findings.map((f) => f.comparison),
                adjudicationId: input.claimSets[0]?.adjudicationId ?? null,
              },
            ],
          },
        };
        if (publications.length === 1) {
          await route.fulfill({ status: 503, json: {} });
          return;
        }
      }
      await route.fulfill({ json: bundle });
      return;
    }
    throw new Error('Unexpected simulated evidence request ' + path);
  });
  return {
    writes,
    publications,
    sessions: () => sessions,
    deny: () => {
      denied = true;
    },
    stale: () => {
      stale = true;
    },
  };
}
async function openAssessment(page: Page) {
  await page.goto('/tenants/' + tenant + '/evidence');
  await page
    .getByRole('button', { name: 'Review contradictions', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Accepted anchor claim ID' })
    .fill(anchor);
  await page.getByRole('button', { name: 'Inspect exact claim set' }).click();
}
async function prefer(page: Page) {
  await page
    .getByRole('combobox', { name: 'Adjudication choice' })
    .selectOption('PREFER_CLAIM');
  await page
    .getByRole('combobox', { name: 'Preferred claim', exact: true })
    .selectOption(anchor);
  await page
    .getByRole('textbox', { name: 'Adjudication rationale' })
    .fill('Prefer independently reviewed recovery guidance');
  await page.getByRole('button', { name: 'Confirm adjudication' }).click();
  await page.getByRole('button', { name: 'Retry exact command' }).click();
  await expect(
    page.getByText('Current candidate-set revision', { exact: true }),
  ).toBeVisible();
}
test('cited comparison, keyboard adjudication and exact bundle recovery retain attribution and historical cutoff', async ({
  page,
}, testInfo) => {
  const bff = await install(page);
  await openAssessment(page);
  await expect(
    page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
  ).toBeVisible();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(2);
  await expect(page.locator('img[src=x]')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Evidence review', exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('contradictions-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('contradictions-narrow.png'),
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Adjudication choice' })
    .selectOption('PREFER_CLAIM');
  await page
    .getByRole('combobox', { name: 'Preferred claim', exact: true })
    .selectOption(anchor);
  await page
    .getByRole('textbox', { name: 'Adjudication rationale' })
    .fill('Prefer independently reviewed recovery guidance');
  await page.getByRole('button', { name: 'Confirm adjudication' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Documentary command result' }),
  ).toBeFocused();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Retry exact command' }),
  ).toBeVisible();
  expect(bff.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Retry exact command' }).click();
  await expect(
    page.getByText('Current candidate-set revision', { exact: true }),
  ).toBeVisible();
  expect(bff.writes[1]).toEqual(bff.writes[0]);
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Confirm bundle publication' })
    .click();
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry exact command' }).click();
  await expect(
    page.getByRole('heading', { name: 'Historical evidence bundle' }),
  ).toBeVisible();
  expect(bff.publications[1]).toEqual(bff.publications[0]);
  await expect(
    page.getByText('2026-10-29T12:00:02Z', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Assessed alternative \(context\)/u),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('bundle-narrow.png'),
    fullPage: true,
  });
  await expect(page.getByText('STRIP-PRIVATE-PROOF')).toHaveCount(0);
  const sessions = bff.sessions();
  bff.deny();
  await page
    .getByRole('button', { name: 'Recheck current documentary access' })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'not currently available',
  );
  await expect(
    page.getByRole('heading', { name: 'Historical evidence bundle' }),
  ).toHaveCount(0);
  expect(bff.sessions()).toBeGreaterThan(sessions);
  await expect(
    page.getByRole('heading', { name: 'Evidence review', exact: true }),
  ).toBeFocused();
});
test('stale publication retires candidates and reacquires historical decision without replacement intent', async ({
  page,
}) => {
  const bff = await install(page);
  await openAssessment(page);
  await prefer(page);
  bff.stale();
  await page
    .getByRole('button', { name: 'Confirm bundle publication' })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Recheck before making a new decision',
  );
  await expect(page.getByText(quote, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Retry exact command' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Recheck documentary evidence' })
    .click();
  await expect(
    page.getByText('Historical decision — candidate set has changed'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirm bundle publication' }),
  ).toHaveCount(0);
  expect(bff.publications).toHaveLength(1);
  await page.getByRole('button', { name: 'Assess current claim set' }).click();
  await expect(
    page.getByRole('heading', { name: 'Claim-set assessment: CONFLICT' }),
  ).toBeVisible();
  expect(bff.publications).toHaveLength(1);
});
for (const mode of [
  'UNDETERMINED',
  'INSUFFICIENT_CANDIDATES',
  'NO_DETECTED_CONFLICT',
] as const)
  test(
    'renders conservative ' + mode + ' assessment without automatic resolution',
    async ({ page }) => {
      const bff = await install(page, mode);
      await openAssessment(page);
      await expect(
        page.getByRole('heading', { name: 'Claim-set assessment: ' + mode }),
      ).toBeVisible();
      if (mode === 'NO_DETECTED_CONFLICT')
        await expect(
          page.getByRole('button', { name: 'Confirm bundle publication' }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole('heading', { name: 'Bundle publication unavailable' }),
        ).toBeVisible();
      expect(bff.writes).toHaveLength(0);
      expect(bff.publications).toHaveLength(0);
    },
  );
