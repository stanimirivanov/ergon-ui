import type { Page } from '@playwright/test';
export const promotionTenant = '11111111-1111-4111-8111-111111111111';
export const promotionArtifact = {
  key: 'contract',
  revision: 'v1',
  sha256: 'a'.repeat(64),
};
export const promotionReports = [
  {
    fixture: { ...promotionArtifact, key: 'scenario' },
    reportId: '22222222-2222-4222-8222-222222222222',
    reportDigest: 'b'.repeat(64),
  },
];
/** Synthetic transport only: no live identity, database, promotion or run admission is exercised. */
export async function installSimulatedPromotionBff(page: Page) {
  let mode: 'pass' | 'ineligible' | 'stale' | 'denied' | 'uncertain' = 'pass';
  const commands: { id: string; body: unknown }[] = [];
  await page.route('**/bff/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = (json: unknown, status = 200) =>
      route.fulfill({
        status,
        json,
        headers: { 'x-ergon-guide-fixture': 'simulated-bff' },
      });
    if (path.endsWith('/session'))
      return reply({
        actorId: promotionTenant,
        identityProvider: 'simulated-sso',
        registeredAt: '2026-10-31T09:00:00Z',
        recordedAt: '2026-10-31T09:00:00Z',
      });
    if (path.endsWith('/csrf'))
      return reply({ headerName: 'X-CSRF-TOKEN', token: 'synthetic-csrf' });
    if (path.endsWith('/reports')) return reply({ items: [], nextAfter: null });
    if (mode === 'denied') return reply({ detail: 'PRIVATE' }, 404);
    if (path.endsWith('/promotion-review')) {
      const body = route.request().postDataJSON() as {
        reports: unknown;
        rationale: string;
      };
      return reply({
        intent: {
          expectedVersion: 3,
          suite: { ...promotionArtifact, key: 'required-suite' },
          contract: promotionArtifact,
          policy: { ...promotionArtifact, key: 'policy' },
          reports: body.reports,
          rationale: body.rationale,
        },
        eligibility: {
          eligible: mode !== 'ineligible',
          reasons: [],
          scenarios: [
            {
              fixture: promotionReports[0]!.fixture,
              reasons: mode === 'ineligible' ? ['REPORT_FAILED'] : [],
            },
          ],
        },
      });
    }
    if (path.includes('/promotion-commands/')) {
      const id = path.split('/').at(-1)!;
      commands.push({ id, body: route.request().postDataJSON() });
      if (mode === 'stale') return reply({}, 409);
      if (mode === 'uncertain') {
        mode = 'pass';
        return route.abort('failed');
      }
      return reply(
        {
          commandId: id,
          created: commands.length === 1,
          contract: promotionArtifact,
          suite: { ...promotionArtifact, key: 'required-suite' },
          bindingVersion: 3,
          promotedAt: '2026-10-31T09:01:00Z',
        },
        commands.length === 1 ? 201 : 200,
      );
    }
    return reply({}, 404);
  });
  return {
    commands,
    setMode: (value: typeof mode) => {
      mode = value;
    },
  };
}
