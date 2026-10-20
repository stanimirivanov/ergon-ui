import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import { decodeExecutionHistory } from '../src/bff/run-execution-history-schemas';
import { normalizeExecutionHistoryFailure } from '../src/bff/run-execution-history-http';

const query = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  expectedSupervisionRevision: 3,
};
const admission = {
  kind: 'RECOVERY',
  supervisionRevision: 2,
  admittedAt: '2026-10-19T08:01:00.123456789Z',
  recordedAt: '2026-10-19T08:02:00.123456789Z',
};
const history = {
  observedAt: '2026-10-19T08:00:00Z',
  supervisionRevision: 3,
  commandRecorded: true,
  entries: [
    admission,
    {
      ...admission,
      kind: 'INITIAL',
      supervisionRevision: 0,
      admittedAt: '2026-10-19T07:59:00Z',
    },
  ],
  truncated: false,
};
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });
const signal = (): AbortSignal => new AbortController().signal;

describe('execution admission history protocol', () => {
  it('normalizes unsupported failures without retaining diagnostics or evaluating unsafe fallbacks', () => {
    expect(
      normalizeExecutionHistoryFailure({
        kind: 'history-unsupported',
        detail: 'secret',
      }),
    ).toEqual({ kind: 'history-unsupported' });
    expect(
      normalizeExecutionHistoryFailure(
        Object.defineProperty({}, 'kind', {
          get() {
            throw new Error('private');
          },
        }),
      ),
    ).toEqual({ kind: 'unexpected-defect' });
    expect(
      normalizeExecutionHistoryFailure({
        kind: 'unexpected-http-status',
        status: '404',
      }),
    ).toEqual({ kind: 'unexpected-defect' });
  });
  it('keeps tie order, backstepping admission times, earlier epochs and nanoseconds, but strips private extras', () => {
    expect(
      decodeExecutionHistory(
        {
          ...history,
          commandId: 'secret',
          entries: history.entries.map((entry) => ({
            ...entry,
            actorId: 'secret',
            providerOperationReference: 'secret',
          })),
        },
        query,
      ),
    ).toEqual(history);
  });
  it('distinguishes supported absence and bounded truncation without requiring INITIAL in the window', () => {
    expect(
      decodeExecutionHistory(
        { ...history, commandRecorded: false, entries: [] },
        query,
      ),
    ).toBeDefined();
    expect(
      decodeExecutionHistory(
        {
          ...history,
          entries: Array.from({ length: 100 }, () => admission),
          truncated: true,
        },
        query,
      ),
    ).toBeDefined();
    expect(
      decodeExecutionHistory({ ...history, entries: [admission] }, query),
    ).toBeDefined();
  });
  it.each([
    { supervisionRevision: 4 },
    { supervisionRevision: Number.MAX_SAFE_INTEGER },
    { commandRecorded: false },
    { entries: [] },
    { truncated: true },
    { entries: Array.from({ length: 101 }, () => admission) },
    { entries: [{ ...admission, kind: 'UNKNOWN' }] },
    { entries: [{ ...admission, supervisionRevision: -1 }] },
    { entries: [{ ...admission, admittedAt: '2026-02-30T08:00:00Z' }] },
    {
      entries: [
        { ...admission, kind: 'INITIAL' },
        { ...admission, kind: 'INITIAL' },
      ],
    },
    {
      entries: [
        admission,
        { ...admission, recordedAt: '2026-10-19T08:02:00.123456788Z' },
      ],
    },
  ])('rejects malformed or inconsistent history %j', (change) => {
    expect(
      decodeExecutionHistory({ ...history, ...change }, query),
    ).toBeUndefined();
  });
  it('uses only a no-store GET and rejects bad query coordinates before transport', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json(history));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.getExecutionHistory(query, signal())).toEqual({
      ok: true,
      value: history,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/execution-history`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(
      await client.getExecutionHistory(
        { ...query, runId: '../other' },
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('retries transient reads once, never permanent denial, and distinguishes unknown route from private absence', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('private transport cause'))
      .mockResolvedValueOnce(json(history))
      .mockResolvedValueOnce(
        json(
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            detail: 'secret',
          },
          404,
        ),
      )
      .mockResolvedValueOnce(json({}, 404));
    const client = createRunSupervisionClient({ fetch });
    expect((await client.getExecutionHistory(query, signal())).ok).toBe(true);
    expect(await client.getExecutionHistory(query, signal())).toEqual({
      ok: false,
      error: { kind: 'not-found' },
    });
    expect(await client.getExecutionHistory(query, signal())).toEqual({
      ok: false,
      error: { kind: 'history-unsupported' },
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('prevents already cancelled requests and aborts a hanging body on timeout', async () => {
    const caller = new AbortController();
    caller.abort();
    let attempts = 0;
    const signals: AbortSignal[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_url, init) => {
        attempts++;
        signals.push(init!.signal as AbortSignal);
        return {
          status: 200,
          json: () => new Promise(() => undefined),
        } as Response;
      });
    const client = createRunSupervisionClient({ fetch, requestTimeoutMs: 20 });
    expect(await client.getExecutionHistory(query, caller.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(attempts).toBe(0);
    expect(await client.getExecutionHistory(query, signal())).toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(signals).toHaveLength(2);
    expect(signals.every((value) => value.aborted)).toBe(true);
  });
});
