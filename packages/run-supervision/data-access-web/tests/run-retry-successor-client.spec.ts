import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import { decodeRetrySuccessor } from '../src/bff/run-retry-successor-schemas';
import { normalizeRetrySuccessorFailure } from '../src/bff/run-retry-successor-http';

const query = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  expectedSupervisionRevision: 3,
};
const target = {
  runId: '33333333-3333-4333-8333-333333333333',
  supervisionRevision: 7,
};
const observation = {
  observedAt: '2026-10-20T08:00:00.123456789Z',
  supervisionRevision: 3,
  successor: target,
};
const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), { status });
const signal = (): AbortSignal => new AbortController().signal;

describe('protected direct retry successor protocol', () => {
  it('preserves independent target epoch and exact UTC precision, stripping all extras', () => {
    expect(
      decodeRetrySuccessor(
        {
          ...observation,
          actorId: 'private',
          commandId: 'private',
          successor: {
            ...target,
            authority: 'private',
            state: 'PRIVATE_STATE',
          },
        },
        query,
      ),
    ).toEqual(observation);
    expect(
      decodeRetrySuccessor({ ...observation, successor: null }, query),
    ).toEqual({ ...observation, successor: null });
    expect(
      decodeRetrySuccessor(
        { ...observation, successor: { ...target, supervisionRevision: 0 } },
        query,
      ),
    ).toBeDefined();
  });
  it.each([
    null,
    {},
    { ...observation, successor: undefined },
    { ...observation, supervisionRevision: 4 },
    { ...observation, supervisionRevision: Number.MAX_SAFE_INTEGER },
    { ...observation, observedAt: '2026-02-30T08:00:00Z' },
    { ...observation, observedAt: '2026-10-20T08:00:00+01:00' },
    { ...observation, successor: [] },
    { ...observation, successor: { ...target, runId: 'not-a-uuid' } },
    {
      ...observation,
      successor: { ...target, runId: query.runId.toUpperCase() },
    },
    { ...observation, successor: { ...target, supervisionRevision: -1 } },
    { ...observation, successor: { ...target, supervisionRevision: 0.5 } },
    {
      ...observation,
      successor: { ...target, supervisionRevision: Number.MAX_SAFE_INTEGER },
    },
  ])(
    'rejects malformed, stale or self-referential observations %j',
    (value) => {
      expect(decodeRetrySuccessor(value, query)).toBeUndefined();
    },
  );
  it('validates coordinates before transport and sends only the protected GET, not expected epochs or CSRF', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json(observation));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.getRetrySuccessor(query, signal())).toEqual({
      ok: true,
      value: observation,
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/retry-successor`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      Accept: 'application/json, application/problem+json',
    });
    for (const change of [
      { tenantId: '../other' },
      { runId: 'bad' },
      { expectedSupervisionRevision: -1 },
      { expectedSupervisionRevision: Number.MAX_SAFE_INTEGER },
    ]) {
      expect(
        await client.getRetrySuccessor({ ...query, ...change }, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-page' } });
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([404, 405, 501])(
    'distinguishes unsupported %s from a recognized private denial',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(json({}, status))
        .mockResolvedValueOnce(
          json(
            {
              type: 'urn:ergon:problem:assigned-resolution-run-not-found',
              detail: 'private',
            },
            404,
          ),
        );
      const client = createRunSupervisionClient({ fetch });
      expect(await client.getRetrySuccessor(query, signal())).toEqual({
        ok: false,
        error: { kind: 'successor-unsupported' },
      });
      expect(await client.getRetrySuccessor(query, signal())).toEqual({
        ok: false,
        error: { kind: 'not-found' },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('retries transient transport once, never malformed observations or permanent authentication failure', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('private'))
      .mockResolvedValueOnce(json(observation))
      .mockResolvedValueOnce(
        json({
          ...observation,
          successor: { runId: query.runId, supervisionRevision: 0 },
        }),
      )
      .mockResolvedValueOnce(
        json(
          { type: 'urn:ergon:problem:browser-authentication-unavailable' },
          503,
        ),
      );
    const client = createRunSupervisionClient({ fetch });
    expect((await client.getRetrySuccessor(query, signal())).ok).toBe(true);
    expect(await client.getRetrySuccessor(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    expect(await client.getRetrySuccessor(query, signal())).toEqual({
      ok: false,
      error: { kind: 'authentication-unavailable' },
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('normalizes only closed failures and contains throwing accessors', () => {
    expect(
      normalizeRetrySuccessorFailure({
        kind: 'successor-unsupported',
        detail: 'private',
      }),
    ).toEqual({ kind: 'successor-unsupported' });
    expect(
      normalizeRetrySuccessorFailure(
        Object.defineProperty({}, 'kind', {
          get() {
            throw new Error('private');
          },
        }),
      ),
    ).toEqual({ kind: 'unexpected-defect' });
    expect(
      normalizeRetrySuccessorFailure({
        kind: 'unexpected-http-status',
        status: '404',
      }),
    ).toEqual({ kind: 'unexpected-defect' });
  });
  it('cancels before fetch and aborts timed-out response bodies on both bounded attempts', async () => {
    const signals: AbortSignal[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_url, init) => {
        const requestSignal = init?.signal;
        if (requestSignal) signals.push(requestSignal);
        return new Response(
          new ReadableStream({
            start() {
              /* Deliberately held body; no external service. */
            },
          }),
        );
      });
    const client = createRunSupervisionClient({ fetch, requestTimeoutMs: 30 });
    const cancelled = new AbortController();
    cancelled.abort();
    expect(await client.getRetrySuccessor(query, cancelled.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(await client.getRetrySuccessor(query, signal())).toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(signals).toHaveLength(2);
    expect(signals.every((value) => value.aborted)).toBe(true);
  });
});
