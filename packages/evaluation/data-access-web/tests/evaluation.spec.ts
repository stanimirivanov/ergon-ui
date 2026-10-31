import { expect, it, vi } from 'vitest';
import { createEvaluationClient, normalizeEvaluationFailure } from '../src';
import {
  parseEvaluationPage,
  parseEvaluationReport,
} from '../src/evaluation-schema';
const id = '11111111-1111-4111-8111-111111111111';
const query = {
  tenantId: id,
  actorId: '22222222-2222-4222-8222-222222222222',
  after: null,
};
const artifact = { key: 'fixture', revision: 'v1', sha256: 'a'.repeat(64) };
const summary = {
  reportId: id,
  fixture: artifact,
  reportDigest: 'b'.repeat(64),
  passed: false,
  recordedAt: '2026-10-30T12:00:00.123456Z',
};
const report = {
  summary,
  evaluator: artifact,
  assertions: artifact,
  checks: [
    {
      id: 'outcome',
      required: true,
      status: 'UNSUPPORTED',
      explanation: 'UNSUPPORTED_ASSERTION',
    },
  ],
  budgets: null,
};
it('uses only session-authorized GET coordinates and strips unknown diagnostics', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json({
      items: [{ ...summary, secret: 'PRIVATE' }],
      nextAfter: null,
      secret: 'PRIVATE',
    }),
  );
  const result = await createEvaluationClient({ fetch }).read(
    query,
    new AbortController().signal,
  );
  expect(result.ok).toBe(true);
  expect(JSON.stringify(result)).not.toContain('PRIVATE');
  expect(fetch).toHaveBeenCalledWith(
    `/bff/v1/tenants/${id}/simulation-lab/reports?limit=20`,
    expect.objectContaining({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    }),
  );
  expect(JSON.stringify(fetch.mock.calls)).not.toContain(query.actorId);
});
it('validates exact report identity and displays unsupported as recorded', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(report));
  const result = await createEvaluationClient({ fetch }).read(
    { tenantId: id, actorId: id, reportId: id },
    new AbortController().signal,
  );
  expect(result).toEqual({ ok: true, value: report });
  expect(parseEvaluationReport(report, query.actorId)).toBeUndefined();
});
it.each([404, 403, 503, 422, 401])(
  'maps HTTP %i without leaking the body',
  async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json(
        {
          type: 'urn:ergon:problem:browser-authentication-required',
          signInPath: '/bff/login',
          detail: 'PRIVATE',
        },
        { status },
      ),
    );
    expect(
      await createEvaluationClient({ fetch }).read(
        query,
        new AbortController().signal,
      ),
    ).toEqual({
      ok: false,
      error: {
        kind:
          status === 401
            ? 'authentication-required'
            : status === 404 || status === 403
              ? 'denied'
              : status === 503
                ? 'unavailable'
                : 'invalid-response',
      },
    });
  },
);
it('rejects invalid input without I/O and closes malformed values', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  expect(
    (
      await createEvaluationClient({ fetch }).read(
        { ...query, tenantId: '../other' },
        new AbortController().signal,
      )
    ).ok,
  ).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  expect(
    normalizeEvaluationFailure({ kind: 'transport', detail: 'PRIVATE' }),
  ).toEqual({ kind: 'transport' });
  expect(normalizeEvaluationFailure(new Error('PRIVATE'))).toEqual({
    kind: 'unexpected-defect',
  });
});
it('rejects repeated, unordered, excessive and mismatched cursor pages', () => {
  expect(
    parseEvaluationPage({ items: [summary, summary], nextAfter: null }, null),
  ).toBeUndefined();
  expect(
    parseEvaluationPage({ items: [summary], nextAfter: id }, null),
  ).toBeUndefined();
  expect(
    parseEvaluationPage({ items: [summary], nextAfter: null }, id),
  ).toBeUndefined();
  expect(
    parseEvaluationPage(
      { items: Array.from({ length: 21 }, () => summary), nextAfter: null },
      null,
    ),
  ).toBeUndefined();
  const newer = {
    ...summary,
    reportId: query.actorId,
    recordedAt: '2026-10-30T12:00:00.123457Z',
  };
  expect(
    parseEvaluationPage({ items: [summary, newer], nextAfter: null }, null),
  ).toBeUndefined();
  expect(
    parseEvaluationPage({ items: [newer, summary], nextAfter: null }, null)
      ?.items,
  ).toHaveLength(2);
});
it('rejects unknown statuses, inconsistent passes and unsafe integer budgets', () => {
  expect(
    parseEvaluationReport(
      { ...report, checks: [{ ...report.checks[0], status: 'MAYBE' }] },
      id,
    ),
  ).toBeUndefined();
  expect(
    parseEvaluationReport(
      { ...report, summary: { ...summary, passed: true } },
      id,
    ),
  ).toBeUndefined();
  expect(
    parseEvaluationReport(
      {
        ...report,
        budgets: {
          currency: 'USD',
          cost: {
            limit: 9007199254740992,
            measured: 0,
            status: 'PASS',
            reason: null,
          },
          simulatedLatency: {
            limit: null,
            measured: 0,
            status: 'NOT_CONFIGURED',
            reason: null,
          },
        },
      },
      id,
    ),
  ).toBeUndefined();
});
it('bounds body decoding and times out a stalled body with cancellation', async () => {
  let cancelled = false;
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
    ),
  );
  const result = await createEvaluationClient({
    fetch,
    requestTimeout: 20,
  }).read(query, new AbortController().signal);
  expect(result).toEqual({ ok: false, error: { kind: 'timeout' } });
  expect(cancelled).toBe(true);
  const large = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response(' '.repeat(2097153)));
  expect(
    await createEvaluationClient({ fetch: large }).read(
      query,
      new AbortController().signal,
    ),
  ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
});
it('cancels outstanding reads without accepting a late response', async () => {
  const controller = new AbortController();
  let resolve!: (response: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const result = createEvaluationClient({ fetch }).read(
    query,
    controller.signal,
  );
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  controller.abort();
  expect(await result).toEqual({
    ok: false,
    error: { kind: 'request-cancelled' },
  });
  resolve(Response.json({ items: [summary], nextAfter: null }));
});
