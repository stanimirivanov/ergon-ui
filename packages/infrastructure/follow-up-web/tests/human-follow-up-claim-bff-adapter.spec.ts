import { describe, expect, it } from 'vitest';

import { createHumanFollowUpBffAdapter } from '../src';
import {
  jsonResponse,
  TENANT_ID,
  validClaim,
  WORK_ITEM_ID,
} from './follow-up-fixtures';

describe('follow-up claim BFF adapter', () => {
  it('obtains an ephemeral CSRF token before claiming with the same-origin session', async () => {
    const requests: Array<{
      readonly url: string;
      readonly method: string | undefined;
      readonly csrf: string | null;
      readonly credentials: RequestInit['credentials'];
    }> = [];
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) => {
        requests.push({
          url: input.toString(),
          method: init?.method,
          csrf: new Headers(init?.headers).get('X-CSRF-TOKEN'),
          credentials: init?.credentials,
        });
        return input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(validClaim(), 201);
      },
    });

    const result = await adapter.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: true, claim: validClaim() });
    expect(requests).toEqual([
      {
        url: '/bff/v1/csrf',
        method: 'GET',
        csrf: null,
        credentials: 'same-origin',
      },
      {
        url: `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/claims`,
        method: 'POST',
        csrf: 'token-1',
        credentials: 'same-origin',
      },
    ]);
  });

  it('discards a rejected CSRF token and obtains a replacement on explicit retry', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        requestCount += 1;
        if (input.toString() === '/bff/v1/csrf') {
          return jsonResponse({
            headerName: 'X-CSRF-TOKEN',
            token: requestCount === 1 ? 'stale-token' : 'fresh-token',
          });
        }
        return requestCount === 2
          ? jsonResponse(
              { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
              403,
            )
          : jsonResponse(validClaim());
      },
    });

    const first = await adapter.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );
    const retry = await adapter.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );

    expect(first).toEqual({ ok: false, error: { kind: 'csrf-rejected' } });
    expect(retry).toEqual({ ok: true, claim: validClaim() });
    expect(requestCount).toBe(4);
  });

  it('does not automatically retry a competing ownership conflict', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        requestCount += 1;
        return input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(
              { type: 'urn:ergon:problem:human-follow-up-already-claimed' },
              409,
            );
      },
    });

    const result = await adapter.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'already-claimed' },
    });
    expect(requestCount).toBe(2);
  });

  it('converts caller cancellation during claim setup', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' }),
    });

    await expect(
      adapter.claim(
        { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
        controller.signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });

  it('rejects a non-positive request timeout at composition time', () => {
    expect(() =>
      createHumanFollowUpBffAdapter({ fetch, requestTimeout: 0 }),
    ).toThrow(
      new RangeError('requestTimeout must be a positive finite number'),
    );
  });
});
