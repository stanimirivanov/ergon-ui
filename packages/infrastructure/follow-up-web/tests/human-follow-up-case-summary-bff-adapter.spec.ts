import { describe, expect, it } from 'vitest';

import { createHumanFollowUpBffAdapter } from '../src';
import {
  CASE_ID,
  jsonResponse,
  RUN_ID,
  TENANT_ID,
  validCaseSummary,
  WORK_ITEM_ID,
} from './follow-up-fixtures';

describe('follow-up case-summary BFF adapter', () => {
  const query = {
    tenantId: TENANT_ID,
    workItemId: WORK_ITEM_ID,
    caseId: CASE_ID,
    runId: RUN_ID,
  };

  it('loads owned case context through the same-origin browser session', async () => {
    let requestedUrl: string | undefined;
    let credentials: unknown;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async (input, init) => {
        requestedUrl = input.toString();
        credentials = init?.credentials;
        return jsonResponse(validCaseSummary());
      },
    });

    const result = await adapter.getOwnedCaseSummary(
      query,
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: true, summary: validCaseSummary() });
    expect(requestedUrl).toBe(
      `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/case-summary`,
    );
    expect(credentials).toBe('same-origin');
  });

  it('rejects case context whose pinned contract contradicts the run', async () => {
    const summary = validCaseSummary();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          ...summary,
          case: {
            ...summary.case,
            resolutionContract: { key: 'other-contract', revision: 2 },
          },
        }),
    });

    await expect(
      adapter.getOwnedCaseSummary(query, new AbortController().signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects handoff context whose retry attempt contradicts the run', async () => {
    const summary = validCaseSummary();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          ...summary,
          escalation: { ...summary.escalation, sourceAttemptNumber: 1 },
        }),
    });

    await expect(
      adapter.getOwnedCaseSummary(query, new AbortController().signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects handoff context that predates its failed execution', async () => {
    const summary = validCaseSummary();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          ...summary,
          failedExecution: {
            ...summary.failedExecution,
            completedAt: '2026-09-21T09:30:01Z',
          },
        }),
    });

    await expect(
      adapter.getOwnedCaseSummary(query, new AbortController().signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('rejects case context associated with a different owned case', async () => {
    const summary = validCaseSummary();
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse({
          ...summary,
          case: {
            ...summary.case,
            caseId: '99999999-9999-4999-8999-999999999999',
          },
        }),
    });

    await expect(
      adapter.getOwnedCaseSummary(query, new AbortController().signal),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('maps unavailable case context without disclosing its cause', async () => {
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () =>
        jsonResponse(
          {
            type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
            detail: 'internal ownership detail',
          },
          404,
        ),
    });

    await expect(
      adapter.getOwnedCaseSummary(query, new AbortController().signal),
    ).resolves.toEqual({ ok: false, error: { kind: 'not-found' } });
  });

  it('retries one transient case-context read', async () => {
    let requestCount = 0;
    const adapter = createHumanFollowUpBffAdapter({
      fetch: async () => {
        requestCount += 1;
        return requestCount === 1
          ? jsonResponse({ type: 'urn:ergon:problem:temporary' }, 503)
          : jsonResponse(validCaseSummary());
      },
    });

    const result = await adapter.getOwnedCaseSummary(
      query,
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    expect(requestCount).toBe(2);
  });
});
