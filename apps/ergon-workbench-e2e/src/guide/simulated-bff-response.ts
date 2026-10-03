import type { Route } from '@playwright/test';

import { SIMULATED_BFF_HEADER } from './simulated-guide-network-boundary';

/** Marks synthetic responses so guide recording cannot mistake them for live BFF data. */
export async function fulfillSimulatedBff(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    contentType:
      status >= 400 ? 'application/problem+json' : 'application/json',
    headers: { [SIMULATED_BFF_HEADER]: 'simulated-bff' },
    body: JSON.stringify(body),
  });
}
