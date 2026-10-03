import type { BrowserContext, Request } from '@playwright/test';

const tenantDocument = /^\/tenants\/[0-9a-f-]+$/u;
const staticResources = new Set(['script', 'stylesheet', 'image', 'font']);
export const SIMULATED_BFF_HEADER = 'x-ergon-guide-fixture';

function isLocalPreviewResource(
  request: Request,
  previewOrigin: string,
): boolean {
  const url = new URL(request.url());
  if (url.origin !== previewOrigin || request.method() !== 'GET') return false;
  if (request.resourceType() === 'document') {
    return url.pathname === '/' || tenantDocument.test(url.pathname);
  }
  return (
    staticResources.has(request.resourceType()) &&
    (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.ico')
  );
}

function requestLabel(request: Request, previewOrigin: string): string {
  const url = new URL(request.url());
  // Omit query values: a future guide must not put sensitive URL data in logs.
  return `${request.method()} ${url.origin === previewOrigin ? '' : url.origin}${url.pathname}`;
}

/**
 * Limits a simulated recording to local preview resources and marked fixture
 * responses. Page routes take precedence over this context fallback, so their
 * BFF responses must carry the fixture marker. Unmatched requests are aborted;
 * unexpected HTTP(S) requests or unmarked BFF responses fail the recording
 * even if the UI recovers. Guide contexts also block service workers.
 */
export async function installSimulatedGuideNetworkBoundary(
  context: BrowserContext,
  previewOrigin: string,
): Promise<{ assertNoUnexpectedRequests: () => Promise<void> }> {
  const unexpected = new Set<string>();
  const responseInspections: Promise<void>[] = [];

  context.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      url.origin !== previewOrigin
    ) {
      unexpected.add(requestLabel(request, previewOrigin));
    }
  });

  context.on('response', (response) => {
    const request = response.request();
    const url = new URL(request.url());
    if (url.origin !== previewOrigin || !url.pathname.startsWith('/bff/'))
      return;
    responseInspections.push(
      response.headerValue(SIMULATED_BFF_HEADER).then((value) => {
        if (value !== 'simulated-bff') {
          unexpected.add(requestLabel(request, previewOrigin));
        }
      }),
    );
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    if (isLocalPreviewResource(request, previewOrigin)) {
      await route.continue();
      return;
    }
    unexpected.add(requestLabel(request, previewOrigin));
    await route.abort('blockedbyclient');
  });

  return {
    assertNoUnexpectedRequests: async (): Promise<void> => {
      await Promise.all(responseInspections);
      if (unexpected.size > 0) {
        throw new Error(
          `Simulated guide attempted requests outside its fixture boundary: ${[...unexpected].sort().join(', ')}`,
        );
      }
    },
  };
}
