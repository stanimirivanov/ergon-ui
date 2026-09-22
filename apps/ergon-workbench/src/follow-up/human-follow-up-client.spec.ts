import { describe, expect, it } from 'vitest';

import { createHumanFollowUpClient } from './human-follow-up-client';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const WORK_ITEM_ID = '11111111-1111-4111-8111-111111111111';
const CASE_ID = '22222222-2222-4222-8222-222222222222';
const RUN_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';

describe('human follow-up client', () => {
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
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOpen(
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

  it('rejects malformed work items before they enter RTK Query', async () => {
    async function fetchStub() {
      return jsonResponse({
        items: [{ ...validPage().items[0], status: 'CLAIMED' }],
        nextCursor: null,
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOpen(
      { tenantId: TENANT_ID, limit: 25 },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('maps a rejected queue without exposing problem detail', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:invalid-human-follow-up-queue',
          detail: 'internal validation detail',
        },
        400,
      );
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOpen(
      { tenantId: TENANT_ID, queueKey: 'invalid', limit: 25 },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'invalid-filter' } });
  });

  it('accepts only the fixed local sign-in path after session expiry', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:browser-authentication-required',
          signInPath: '/bff/login',
        },
        401,
      );
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOpen(
      { tenantId: TENANT_ID, limit: 25 },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'authentication-required', signInPath: '/bff/login' },
    });
  });

  it('retries one transient read but not a stable invalid query', async () => {
    let requestCount = 0;
    async function fetchStub() {
      requestCount += 1;
      return requestCount === 1
        ? jsonResponse({ type: 'urn:ergon:problem:temporary' }, 503)
        : jsonResponse(validPage());
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOpen(
      { tenantId: TENANT_ID, limit: 25 },
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    expect(requestCount).toBe(2);
  });
});

function validPage() {
  return {
    items: [
      {
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
        escalationEventId: EVENT_ID,
        reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
        queueKey: 'access-restoration',
        status: 'OPEN' as const,
        openedAt: '2026-09-21T09:30:00Z',
        recordedAt: '2026-09-21T09:30:01Z',
      },
    ],
    nextCursor: {
      afterOpenedAt: '2026-09-21T09:30:00Z',
      afterWorkItemId: WORK_ITEM_ID,
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
