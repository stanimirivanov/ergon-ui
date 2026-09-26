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
      error: { kind: 'authentication-required' },
    });

    const rejectedClient = createHumanFollowUpClient({
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
      rejectedClient.listOpen(
        { tenantId: TENANT_ID, limit: 25 },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'unexpected-response', status: 401 },
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

  it('decodes resolver-owned work and sends both claim cursor values', async () => {
    let requestedUrl: string | undefined;
    async function fetchStub(input: Parameters<typeof fetch>[0]) {
      requestedUrl = input.toString();
      return jsonResponse(validOwnedPage());
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOwned(
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
    async function fetchStub() {
      const page = validOwnedPage();
      return jsonResponse({
        ...page,
        items: [
          {
            ...page.items[0],
            claim: { ...validClaim(), workItemId: CASE_ID },
          },
        ],
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.listOwned(
      { tenantId: TENANT_ID, limit: 25 },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('loads owned case context through the same-origin browser session', async () => {
    let requestedUrl: string | undefined;
    let credentials: unknown;
    async function fetchStub(
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) {
      requestedUrl = input.toString();
      credentials = init?.credentials;
      return jsonResponse(validCaseSummary());
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: true, summary: validCaseSummary() });
    expect(requestedUrl).toBe(
      `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/case-summary`,
    );
    expect(credentials).toBe('same-origin');
  });

  it('rejects case context whose pinned contract contradicts the run', async () => {
    async function fetchStub() {
      const summary = validCaseSummary();
      return jsonResponse({
        ...summary,
        case: {
          ...summary.case,
          resolutionContract: { key: 'other-contract', revision: 2 },
        },
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects handoff context whose retry attempt contradicts the run', async () => {
    async function fetchStub() {
      const summary = validCaseSummary();
      return jsonResponse({
        ...summary,
        escalation: { ...summary.escalation, sourceAttemptNumber: 1 },
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects handoff context that predates its failed execution', async () => {
    async function fetchStub() {
      const summary = validCaseSummary();
      return jsonResponse({
        ...summary,
        failedExecution: {
          ...summary.failedExecution,
          completedAt: '2026-09-21T09:30:01Z',
        },
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects case context associated with a different owned case', async () => {
    async function fetchStub() {
      const summary = validCaseSummary();
      return jsonResponse({
        ...summary,
        case: {
          ...summary.case,
          caseId: '99999999-9999-4999-8999-999999999999',
        },
      });
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('maps unavailable owned case context without disclosing its cause', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
          detail: 'internal ownership detail',
        },
        404,
      );
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'not-found' } });
  });

  it('retries one transient owned case-context read', async () => {
    let requestCount = 0;
    async function fetchStub() {
      requestCount += 1;
      return requestCount === 1
        ? jsonResponse({ type: 'urn:ergon:problem:temporary' }, 503)
        : jsonResponse(validCaseSummary());
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: CASE_ID,
        runId: RUN_ID,
      },
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    expect(requestCount).toBe(2);
  });

  it('obtains an ephemeral CSRF token before claiming with the same-origin session', async () => {
    const requests: Array<{
      readonly url: string;
      readonly method: string | undefined;
      readonly csrf: string | null;
      readonly credentials: RequestInit['credentials'];
    }> = [];
    async function fetchStub(
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) {
      requests.push({
        url: input.toString(),
        method: init?.method,
        csrf: new Headers(init?.headers).get('X-CSRF-TOKEN'),
        credentials: init?.credentials,
      });
      return input.toString() === '/bff/v1/csrf'
        ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
        : jsonResponse(validClaim(), 201);
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.claim(
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
    async function fetchStub(input: Parameters<typeof fetch>[0]) {
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
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const first = await client.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );
    const retry = await client.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );

    expect(first).toEqual({ ok: false, error: { kind: 'csrf-rejected' } });
    expect(retry).toEqual({ ok: true, claim: validClaim() });
    expect(requestCount).toBe(4);
  });

  it('does not automatically retry a competing ownership conflict', async () => {
    let requestCount = 0;
    async function fetchStub(input: Parameters<typeof fetch>[0]) {
      requestCount += 1;
      return input.toString() === '/bff/v1/csrf'
        ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
        : jsonResponse(
            { type: 'urn:ergon:problem:human-follow-up-already-claimed' },
            409,
          );
    }
    const client = createHumanFollowUpClient({ fetch: fetchStub });

    const result = await client.claim(
      { tenantId: TENANT_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'already-claimed' } });
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

function validClaim() {
  return {
    claimId: '77777777-7777-4777-8777-777777777777',
    workItemId: WORK_ITEM_ID,
    claimedAt: '2026-09-22T10:15:00Z',
    recordedAt: '2026-09-22T10:15:01Z',
  };
}

function validOwnedPage() {
  return {
    items: [{ workItem: validPage().items[0], claim: validClaim() }],
    nextCursor: {
      afterClaimedAt: '2026-09-22T10:15:00Z',
      afterClaimId: '77777777-7777-4777-8777-777777777777',
    },
  };
}

function validCaseSummary() {
  return {
    followUp: {
      workItemId: WORK_ITEM_ID,
      queueKey: 'access-restoration',
      escalationReason: 'RETRY_ATTEMPT_LIMIT_REACHED',
      openedAt: '2026-09-21T09:30:00Z',
      claimedAt: '2026-09-22T10:15:00Z',
    },
    case: {
      caseId: CASE_ID,
      goal: 'Restore access to the customer workspace',
      status: 'OPEN' as const,
      streamVersion: 4,
      resolutionContract: { key: 'access-restoration', revision: 2 },
    },
    observations: [
      {
        streamVersion: 1,
        eventType: 'SourceObservationRecorded',
        summary: 'Customer cannot sign in',
        observationId: '88888888-8888-4888-8888-888888888888',
        originType: 'EMAIL',
        provider: 'support-mailbox',
        reference: 'message-42',
        content: 'The sign-in link returns an expired-token message.',
        occurredAt: '2026-09-21T09:20:00Z',
        recordedAt: '2026-09-21T09:20:01Z',
      },
    ],
    resolutionRun: {
      runId: RUN_ID,
      caseEvidenceStreamVersion: 4,
      contractKey: 'access-restoration',
      contractRevision: 2,
      policyRevision: 'policy-7',
      stepId: 'verify-account-owner',
      capability: 'identity.lookup',
      effectiveRisk: 'HIGH' as const,
      requiredApproval: 'RESOLVER',
      attemptNumber: 2,
      predecessorRunId: null,
      state: 'ESCALATED' as const,
      stateVersion: 3,
      stateUpdatedAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
    failedExecution: {
      connector: 'identity-stub',
      outcome: 'FAILED' as const,
      completedAt: '2026-09-21T09:29:30Z',
      recordedAt: '2026-09-21T09:29:31Z',
    },
    escalation: {
      retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
      sourceAttemptNumber: 2,
      maximumAttempts: 2,
      occurredAt: '2026-09-21T09:30:00Z',
      recordedAt: '2026-09-21T09:30:01Z',
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
