import { describe, expect, it } from 'vitest';

import { createHumanFollowUpBffAdapter } from '../src';
import {
  COMMAND_ID,
  jsonResponse,
  TENANT_ID,
  validClaim,
  validClaimReceipt,
  WORK_ITEM_ID,
} from './follow-up-fixtures';

const command = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: COMMAND_ID,
  expectedOwnershipRevision: 0,
};

describe('follow-up claim BFF adapter', () => {
  it('obtains an ephemeral CSRF token before claiming with the same-origin session', async () => {
    const requests: Array<{
      readonly url: string;
      readonly method: string | undefined;
      readonly csrf: string | null;
      readonly credentials: RequestInit['credentials'];
      readonly contentType: string | null;
      readonly body: unknown;
    }> = [];
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) => {
        requests.push({
          url: input.toString(),
          method: init?.method,
          csrf: new Headers(init?.headers).get('X-CSRF-TOKEN'),
          credentials: init?.credentials,
          contentType: new Headers(init?.headers).get('Content-Type'),
          body:
            init?.body === undefined
              ? undefined
              : JSON.parse(String(init.body)),
        });
        return input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(validClaimReceipt(), 201);
      },
    });

    const result = await adapter.claim(command, new AbortController().signal);

    expect(result).toEqual({ ok: true, claim: validClaim() });
    expect(requests).toEqual([
      {
        url: '/bff/v1/csrf',
        method: 'GET',
        csrf: null,
        credentials: 'same-origin',
        contentType: null,
        body: undefined,
      },
      {
        url: `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/claim-commands`,
        method: 'POST',
        csrf: 'token-1',
        credentials: 'same-origin',
        contentType: 'application/json',
        body: { commandId: COMMAND_ID, expectedOwnershipRevision: 0 },
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
          : jsonResponse(validClaimReceipt());
      },
    });

    const first = await adapter.claim(command, new AbortController().signal);
    const retry = await adapter.claim(command, new AbortController().signal);

    expect(first).toEqual({ ok: false, error: { kind: 'csrf-rejected' } });
    expect(retry).toEqual({ ok: true, claim: validClaim() });
    expect(requestCount).toBe(4);
  });

  it('claims previously released work at its current even revision', async () => {
    const releasedCommand = { ...command, expectedOwnershipRevision: 2 };
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) =>
        input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(
              validClaimReceipt(
                JSON.parse(String(init?.body)).commandId,
                releasedCommand.expectedOwnershipRevision,
              ),
              201,
            ),
    });

    await expect(
      adapter.claim(releasedCommand, new AbortController().signal),
    ).resolves.toEqual({ ok: true, claim: validClaim() });
  });

  it('rejects a receipt for another command or ownership revision', async () => {
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) =>
        input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(
              validClaimReceipt('99999999-9999-4999-8999-999999999999'),
            ),
    });

    await expect(
      adapter.claim(command, new AbortController().signal),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
  });

  it('shares one in-flight CSRF request between concurrent claims', async () => {
    let csrfRequestCount = 0;
    let claimRequestCount = 0;
    let releaseToken: () => void = () => undefined;
    let announceTokenRequest: () => void = () => undefined;
    const tokenGate = new Promise<void>((resolve) => {
      releaseToken = resolve;
    });
    const tokenRequested = new Promise<void>((resolve) => {
      announceTokenRequest = resolve;
    });
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        if (input.toString() === '/bff/v1/csrf') {
          csrfRequestCount += 1;
          announceTokenRequest();
          await tokenGate;
          return jsonResponse({
            headerName: 'X-CSRF-TOKEN',
            token: 'shared-token',
          });
        }
        claimRequestCount += 1;
        return jsonResponse(validClaimReceipt());
      },
    });

    const firstClaim = adapter.claim(command, new AbortController().signal);
    const secondClaim = adapter.claim(command, new AbortController().signal);

    await tokenRequested;
    expect(csrfRequestCount).toBe(1);
    releaseToken();

    await expect(Promise.all([firstClaim, secondClaim])).resolves.toEqual([
      { ok: true, claim: validClaim() },
      { ok: true, claim: validClaim() },
    ]);
    expect(claimRequestCount).toBe(2);
  });

  it('does not automatically retry a competing ownership conflict', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        requestCount += 1;
        return input.toString() === '/bff/v1/csrf'
          ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
          : jsonResponse(
              {
                type: 'urn:ergon:problem:human-follow-up-ownership-revision-conflict',
              },
              409,
            );
      },
    });

    const result = await adapter.claim(command, new AbortController().signal);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'ownership-revision-conflict' },
    });
    expect(requestCount).toBe(2);
  });

  it('does not retry a timed-out CSRF request', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () => {
        requestCount += 1;
        return new Promise<Response>(() => undefined);
      },
      requestTimeout: 10,
    });

    await expect(
      adapter.claim(command, new AbortController().signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(requestCount).toBe(1);
  });

  it('converts caller cancellation during claim setup', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' }),
    });

    await expect(adapter.claim(command, controller.signal)).resolves.toEqual({
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
