import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import { decodeInvocationHistory } from '../src/bff/run-invocation-history-schemas';

const query = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  expectedSupervisionRevision: 3,
};
const instant = '2026-10-20T08:00:00.123456789Z';
const completion = {
  outcome: 'UNKNOWN',
  completedAt: '2026-10-20T07:00:00Z',
  recordedAt: instant,
  timing: {
    source: 'ergon.dev/measurement/connector-call/v1',
    startedAt: instant,
    elapsedNanoseconds: '9223372036854775807',
  },
};
const preparation = {
  stepId: 'one',
  capability: 'identity.reset',
  connector: 'identity-stub',
  preparedAt: instant,
  recordedAt: instant,
  completion,
};
const history = {
  observedAt: instant,
  supervisionRevision: 3,
  entries: [
    preparation,
    { ...preparation, recordedAt: '2026-10-20T06:00:00Z', completion: null },
  ],
  truncated: false,
};
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });
const signal = (): AbortSignal => new AbortController().signal;

describe('gateway-attempt history protocol', () => {
  it('preserves recording order, clock backsteps, uncertainty and exact Long duration while stripping every private extra', () => {
    expect(
      decodeInvocationHistory(
        {
          ...history,
          actor: 'private',
          entries: [
            {
              ...preparation,
              commandId: 'private',
              completion: {
                ...completion,
                cause: 'private',
                timing: { ...completion.timing, payload: 'private' },
              },
            },
            history.entries[1],
          ],
        },
        query,
      ),
    ).toEqual(history);
  });
  it.each(['SUCCEEDED', 'FAILED', 'UNKNOWN'])(
    'accepts measured zero and %s without inventing causal time constraints',
    (outcome) => {
      const value = {
        ...history,
        entries: [
          {
            ...preparation,
            completion: {
              ...completion,
              outcome,
              timing: { ...completion.timing, elapsedNanoseconds: '0' },
            },
          },
        ],
      };
      expect(decodeInvocationHistory(value, query)).toEqual(value);
    },
  );
  it.each([
    '-1',
    '00',
    '01',
    '+1',
    '1.0',
    '1e3',
    '9223372036854775808',
    '100000000000000000000',
    1,
    null,
  ])('rejects noncanonical/out-of-range duration %j', (elapsedNanoseconds) => {
    expect(
      decodeInvocationHistory(
        {
          ...history,
          entries: [
            {
              ...preparation,
              completion: {
                ...completion,
                timing: { ...completion.timing, elapsedNanoseconds },
              },
            },
          ],
        },
        query,
      ),
    ).toBeUndefined();
  });
  it.each([
    null,
    {},
    { ...history, supervisionRevision: 4 },
    { ...history, supervisionRevision: Number.MAX_SAFE_INTEGER },
    { ...history, observedAt: '2026-02-30T08:00:00Z' },
    { ...history, observedAt: '2026-10-20T08:00:00+01:00' },
    { ...history, entries: null },
    { ...history, entries: Array.from({ length: 101 }, () => preparation) },
    { ...history, truncated: true },
    { ...history, entries: [{ ...preparation, stepId: '  ' }] },
    { ...history, entries: [{ ...preparation, completion: undefined }] },
    {
      ...history,
      entries: [
        { ...preparation, completion: { ...completion, timing: null } },
      ],
    },
    {
      ...history,
      entries: [
        { ...preparation, completion: { ...completion, outcome: 'RUNNING' } },
      ],
    },
  ])('rejects malformed/stale projection %j', (body) =>
    expect(decodeInvocationHistory(body, query)).toBeUndefined(),
  );
  it('distinguishes empty supported coverage and explicit 100-row truncation', () => {
    expect(
      decodeInvocationHistory({ ...history, entries: [] }, query),
    ).toBeDefined();
    expect(
      decodeInvocationHistory(
        {
          ...history,
          entries: Array.from({ length: 100 }, () => preparation),
          truncated: true,
        },
        query,
      ),
    ).toBeDefined();
  });
  it('sends only a no-store protected GET and validates coordinates before transport', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json(history));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.getInvocationHistory(query, signal())).toEqual({
      ok: true,
      value: history,
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/invocation-history`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    for (const change of [
      { tenantId: '../bad' },
      { runId: 'bad' },
      { expectedSupervisionRevision: -1 },
      { expectedSupervisionRevision: Number.MAX_SAFE_INTEGER },
    ])
      expect(
        await client.getInvocationHistory({ ...query, ...change }, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([404, 405, 501])(
    'distinguishes missing route %s from neutral protected denial',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(json({}, status))
        .mockResolvedValueOnce(
          json(
            { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
            404,
          ),
        );
      const client = createRunSupervisionClient({ fetch });
      expect(await client.getInvocationHistory(query, signal())).toEqual({
        ok: false,
        error: { kind: 'history-unsupported' },
      });
      expect(await client.getInvocationHistory(query, signal())).toEqual({
        ok: false,
        error: { kind: 'not-found' },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('retries transient reads once, but not malformed data or disabled authentication', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('private'))
      .mockResolvedValueOnce(json(history))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(
        json(
          { type: 'urn:ergon:problem:browser-authentication-unavailable' },
          503,
        ),
      );
    const client = createRunSupervisionClient({ fetch });
    expect((await client.getInvocationHistory(query, signal())).ok).toBe(true);
    expect(await client.getInvocationHistory(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    expect(await client.getInvocationHistory(query, signal())).toEqual({
      ok: false,
      error: { kind: 'authentication-unavailable' },
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('does not start a cancelled request and interrupts a held transport', async () => {
    const controller = new AbortController();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => new Promise(() => undefined));
    const client = createRunSupervisionClient({ fetch });
    const pending = client.getInvocationHistory(query, controller.signal);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    controller.abort();
    expect(await pending).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(await client.getInvocationHistory(query, controller.signal)).toEqual(
      { ok: false, error: { kind: 'request-cancelled' } },
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
