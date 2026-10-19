import type { Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

/** Legacy guide chapters explicitly model rollout off, never an unavailable-route fallback. */
export async function installDisabledRunControl(
  page: Page,
  epoch: () => number = () => 0,
): Promise<void> {
  await page.route('**/bff/v1/tenants/*/resolution-runs/*/control', (route) =>
    fulfillSimulatedBff(route, {
      status: 'DISABLED',
      supervisionRevision: epoch(),
      observedAt: '2026-10-19T08:00:00Z',
      fence: null,
      expiresAt: null,
    }),
  );
}
