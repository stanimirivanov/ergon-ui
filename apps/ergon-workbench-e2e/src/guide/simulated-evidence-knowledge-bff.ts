import { expect, type Page } from '@playwright/test';
import { SIMULATED_BFF_HEADER } from './simulated-guide-network-boundary';

export const tenant = '11111111-1111-4111-8111-111111111111',
  actor = '22222222-2222-4222-8222-222222222222';
export const anchor = '33333333-3333-4333-8333-333333333333',
  other = '77777777-7777-4777-8777-777777777777';
const source = '44444444-4444-4444-8444-444444444444',
  extraction = '55555555-5555-4555-8555-555555555555';
const review = '88888888-8888-4888-8888-888888888888',
  review2 = '99999999-9999-4999-8999-999999999999';
export const quote = '<img src=x onerror=alert(1)> Recovery guidance 😀';
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
export async function install(
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
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
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
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        json: { headerName: 'X-CSRF-TOKEN', token: 'fresh-test-token' },
      });
      return;
    }
    if (denied) {
      await route.fulfill({
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        status: 404,
        json: {},
      });
      return;
    }
    if (path.endsWith('/pending')) {
      await route.fulfill({
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        json: { entries: [], next: null },
      });
      return;
    }
    if (path.includes('/claims/')) {
      await route.fulfill({
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        json: data,
      });
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
          await route.fulfill({
            headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
            status: 503,
            json: {},
          });
          return;
        }
      }
      const current =
        typeof decision === 'object' && decision !== null
          ? { ...decision, current: decisionCurrent }
          : {};
      await route.fulfill({
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        json: current,
      });
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
          await route.fulfill({
            headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
            status: 409,
            json: {},
          });
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
          await route.fulfill({
            headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
            status: 503,
            json: {},
          });
          return;
        }
      }
      await route.fulfill({
        headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
        json: bundle,
      });
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
export async function openAssessment(page: Page) {
  await page.goto('/tenants/' + tenant + '/evidence');
  await page
    .getByRole('button', { name: 'Review contradictions', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Accepted anchor claim ID' })
    .fill(anchor);
  await page.getByRole('button', { name: 'Inspect exact claim set' }).click();
}
export async function prefer(page: Page) {
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
