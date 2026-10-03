import { describe, expect, it } from 'vitest';

import { createHumanFollowUpBffAdapter } from '../src';
import {
  jsonResponse,
  TENANT_ID,
  validClaimReceipt,
  validRelease,
  WORK_ITEM_ID,
} from './follow-up-fixtures';

const command = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  claimId: validRelease().claimId,
  expectedOwnershipRevision: 1,
};

describe('follow-up release BFF adapter', () => {
  it('shares the ephemeral CSRF token with claiming and sends the exact release tuple', async () => {
    const requests: Array<{
      url: string;
      csrf: string | null;
      credentials: RequestInit['credentials'];
      body: unknown;
    }> = [];
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) => {
        const url = input.toString();
        requests.push({
          url,
          csrf: new Headers(init?.headers).get('X-CSRF-TOKEN'),
          credentials: init?.credentials,
          body:
            init?.body === undefined
              ? undefined
              : JSON.parse(String(init.body)),
        });
        if (url === '/bff/v1/csrf') {
          return jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' });
        }
        return url.endsWith('/release')
          ? jsonResponse(validRelease(), 201)
          : jsonResponse(validClaimReceipt(), 201);
      },
    });

    await adapter.claim(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        commandId: validClaimReceipt().commandId,
        expectedOwnershipRevision: 0,
      },
      new AbortController().signal,
    );
    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: true, release: validRelease() });
    expect(requests).toHaveLength(3);
    expect(requests[2]).toEqual({
      url: `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/claims/${command.claimId}/release`,
      csrf: 'token-1',
      credentials: 'same-origin',
      body: { expectedOwnershipRevision: 1 },
    });
  });

  it('accepts an exact replay without automatically sending another POST', async () => {
    let releaseRequests = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        if (input.toString() === '/bff/v1/csrf') {
          return jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' });
        }
        releaseRequests += 1;
        return jsonResponse(validRelease(), 200);
      },
    });

    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: true, release: validRelease() });
    expect(releaseRequests).toBe(1);
  });

  it('discards a rejected CSRF token before an explicit release retry', async () => {
    let csrfRequests = 0;
    let releaseRequests = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) => {
        if (input.toString() === '/bff/v1/csrf') {
          csrfRequests += 1;
          return jsonResponse({
            headerName: 'X-CSRF-TOKEN',
            token: csrfRequests === 1 ? 'stale-token' : 'fresh-token',
          });
        }
        releaseRequests += 1;
        if (releaseRequests === 1) {
          expect(new Headers(init?.headers).get('X-CSRF-TOKEN')).toBe(
            'stale-token',
          );
          return jsonResponse(
            { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
            403,
          );
        }
        expect(new Headers(init?.headers).get('X-CSRF-TOKEN')).toBe(
          'fresh-token',
        );
        return jsonResponse(validRelease(), 200);
      },
    });

    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: false, error: { kind: 'csrf-rejected' } });
    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: true, release: validRelease() });
    expect(csrfRequests).toBe(2);
    expect(releaseRequests).toBe(2);
  });

  it('converts caller cancellation before release setup', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' }),
    });

    await expect(adapter.release(command, controller.signal)).resolves.toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });

  it('rejects a mismatched success receipt', async () => {
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) =>
        input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse({ ...validRelease(), ownershipRevision: 4 }),
    });

    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
  });

  it.each([
    [
      409,
      'human-follow-up-ownership-revision-conflict',
      'ownership-revision-conflict',
    ],
    [404, 'human-follow-up-release-not-found', 'not-found'],
    [503, 'human-follow-up-release-unavailable', 'release-unavailable'],
    [400, 'invalid-human-follow-up-release-command', 'invalid-release-command'],
  ] as const)('maps %i %s without retry', async (status, type, kind) => {
    let releaseRequests = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        if (input.toString() === '/bff/v1/csrf') {
          return jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' });
        }
        releaseRequests += 1;
        return jsonResponse({ type: `urn:ergon:problem:${type}` }, status);
      },
    });

    await expect(
      adapter.release(command, new AbortController().signal),
    ).resolves.toEqual({ ok: false, error: { kind } });
    expect(releaseRequests).toBe(1);
  });
});
