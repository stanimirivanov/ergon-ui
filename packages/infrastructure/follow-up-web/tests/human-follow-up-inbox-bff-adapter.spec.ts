import { describe, expect, it } from 'vitest';

import { createHumanFollowUpBffAdapter } from '../src';
import {
  CASE_ID,
  jsonResponse,
  TENANT_ID,
  validClaim,
  validOwnedPage,
  validPage,
  WORK_ITEM_ID,
} from './follow-up-fixtures';

describe('follow-up inbox BFF adapter', () => {
  it('sends filters and both cursor values with the same-origin session', async () => {
    let requestedUrl: string | undefined;
    let credentials: unknown;
    async function fetchStub(
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) {
      requestedUrl = input.toString();
      credentials = init?.credentials;
      return jsonResponse(validPage());
    }
    const adapter = createHumanFollowUpBffAdapter({ fetch: fetchStub });

    const result = await adapter.listOpen(
      {
        tenantId: TENANT_ID,
        queueKey: 'access-restoration',
        limit: 25,
        cursor: {
          afterOpenedAt: '2026-09-21T09:00:00Z',
          afterWorkItemId: WORK_ITEM_ID,
        },
      },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: true, page: validPage() });
    expect(requestedUrl).toBe(
      `/bff/v1/tenants/${TENANT_ID}/human-follow-ups?limit=25&queueKey=access-restoration&afterOpenedAt=2026-09-21T09%3A00%3A00Z&afterWorkItemId=${WORK_ITEM_ID}`,
    );
    expect(credentials).toBe('same-origin');
  });

  it('rejects malformed work items before they enter application state', async () => {
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          items: [{ ...validPage().items[0], status: 'CLAIMED' }],
          nextCursor: null,
        }),
    });

    await expect(
      adapter.listOpen(
        { tenantId: TENANT_ID, limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('maps a rejected queue without exposing problem detail', async () => {
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse(
          {
            type: 'urn:ergon:problem:invalid-human-follow-up-queue',
            detail: 'internal validation detail',
          },
          400,
        ),
    });

    await expect(
      adapter.listOpen(
        { tenantId: TENANT_ID, queueKey: 'invalid', limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-filter' },
    });
  });

  it('accepts only the fixed local sign-in path after session expiry', async () => {
    const acceptedAdapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse(
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath: '/bff/login',
          },
          401,
        ),
    });

    await expect(
      acceptedAdapter.listOpen(
        { tenantId: TENANT_ID, limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'authentication-required' },
    });

    const rejectedAdapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse(
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath: 'https://attacker.example/collect',
          },
          401,
        ),
    });

    await expect(
      rejectedAdapter.listOpen(
        { tenantId: TENANT_ID, limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'unexpected-response', status: 401 },
    });
  });

  it('retries one transient read', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () => {
        requestCount += 1;
        return requestCount === 1
          ? jsonResponse({ type: 'urn:ergon:problem:temporary' }, 503)
          : jsonResponse(validPage());
      },
    });

    const result = await adapter.listOpen(
      { tenantId: TENANT_ID, limit: 25 },
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    expect(requestCount).toBe(2);
  });

  it('converts caller cancellation into the application failure contract', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () => jsonResponse(validPage()),
    });

    await expect(
      adapter.listOpen({ tenantId: TENANT_ID, limit: 25 }, controller.signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });

  it('decodes owned work and sends both claim cursor values', async () => {
    let requestedUrl: string | undefined;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input) => {
        requestedUrl = input.toString();
        return jsonResponse(validOwnedPage());
      },
    });

    const result = await adapter.listOwned(
      {
        tenantId: TENANT_ID,
        limit: 25,
        cursor: {
          afterClaimedAt: '2026-09-22T09:00:00Z',
          afterClaimId: '66666666-6666-4666-8666-666666666666',
        },
      },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: true, page: validOwnedPage() });
    expect(requestedUrl).toBe(
      `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/owned?limit=25&afterClaimedAt=2026-09-22T09%3A00%3A00Z&afterClaimId=66666666-6666-4666-8666-666666666666`,
    );
  });

  it('rejects owned work whose claim belongs to another work item', async () => {
    const page = validOwnedPage();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          ...page,
          items: [
            {
              ...page.items[0],
              claim: { ...validClaim(), workItemId: CASE_ID },
            },
          ],
        }),
    });

    await expect(
      adapter.listOwned(
        { tenantId: TENANT_ID, limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
});
