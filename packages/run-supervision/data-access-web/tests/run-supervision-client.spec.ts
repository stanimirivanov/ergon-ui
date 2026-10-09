import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRunSupervisionClient } from '../src';
import {
  ASSIGNMENT_ID,
  OTHER_RUN_ID,
  RUN_ID,
  TENANT_ID,
  jsonResponse,
  validConsole,
  validPage,
} from './run-supervision-fixtures';

const listQuery = { tenantId: TENANT_ID };
const consoleQuery = { tenantId: TENANT_ID, runId: RUN_ID };
const signal = (): AbortSignal => new AbortController().signal;

afterEach(() => vi.useRealTimers());

describe('assigned-run browser client', () => {
  it('preserves the paired nanosecond cursor and same-origin no-store read settings', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(validPage()));
    const client = createRunSupervisionClient({ fetch });
    const cursor = {
      assignedAt: '2026-10-01T09:05:00.123456789Z',
      assignmentId: ASSIGNMENT_ID,
    };

    await expect(
      client.listAssigned({ ...listQuery, limit: 20, cursor }, signal()),
    ).resolves.toEqual({ ok: true, page: validPage() });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${TENANT_ID}/resolution-runs/assigned?limit=20&afterAssignedAt=2026-10-01T09%3A05%3A00.123456789Z&afterAssignmentId=${ASSIGNMENT_ID}`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('uses the exact console endpoint and preserves terminal state as a recorded snapshot', async () => {
    const console = {
      ...validConsole(),
      state: 'VERIFIED_RESOLVED' as const,
      stateVersion: 2,
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(console));
    const client = createRunSupervisionClient({ fetch });

    await expect(client.getConsole(consoleQuery, signal())).resolves.toEqual({
      ok: true,
      console,
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${TENANT_ID}/resolution-runs/${RUN_ID}/console`,
    );
  });

  it.each([
    { tenantId: '../other' },
    { tenantId: TENANT_ID, limit: 0 },
    { tenantId: TENANT_ID, limit: 101 },
    { tenantId: TENANT_ID, limit: 1.5 },
    {
      tenantId: TENANT_ID,
      cursor: { assignedAt: 'invalid', assignmentId: ASSIGNMENT_ID },
    },
  ])('rejects invalid navigation query before fetching: %j', async (query) => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createRunSupervisionClient({ fetch }).listAssigned(query, signal()),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid run coordinates before fetching', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createRunSupervisionClient({ fetch }).getConsole(
        { tenantId: TENANT_ID, runId: '../assigned' },
        signal(),
      ),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      ...validPage(),
      entries: [{ ...validPage().entries[0], state: 'ESCALATED' }],
    },
    {
      ...validPage(),
      entries: [validPage().entries[0], validPage().entries[0]],
    },
    {
      ...validPage(),
      entries: [
        {
          ...validPage().entries[0],
          stateVersion: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    },
    {
      entries: [],
      nextCursor: {
        assignedAt: '2026-10-01T09:00:00Z',
        assignmentId: ASSIGNMENT_ID,
      },
    },
    {
      ...validPage(),
      nextCursor: {
        assignedAt: '2026-02-30T09:00:00Z',
        assignmentId: ASSIGNMENT_ID,
      },
    },
    { items: validPage().entries, nextCursor: null },
  ])('rejects invalid discovery projections without retrying', async (body) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => jsonResponse(body));
    await expect(
      createRunSupervisionClient({ fetch }).listAssigned(listQuery, signal()),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('rejects oversized pages and repeating keysets', async () => {
    const oversized = createRunSupervisionClient({
      fetch: async () =>
        jsonResponse({
          entries: [
            validPage().entries[0],
            { ...validPage().entries[0], runId: OTHER_RUN_ID },
          ],
          nextCursor: null,
        }),
    });
    await expect(
      oversized.listAssigned({ ...listQuery, limit: 1 }, signal()),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: 'invalid-response' },
    });
    const cursor = {
      assignedAt: '2026-10-01T09:00:00Z',
      assignmentId: ASSIGNMENT_ID,
    };
    const repeated = createRunSupervisionClient({
      fetch: async () => jsonResponse({ ...validPage(), nextCursor: cursor }),
    });
    await expect(
      repeated.listAssigned({ ...listQuery, cursor }, signal()),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it.each([
    { ...validConsole(), runId: OTHER_RUN_ID },
    { ...validConsole(), contractRevision: 0 },
    {
      ...validConsole(),
      caseEvidenceStreamVersion: Number.MAX_SAFE_INTEGER + 1,
    },
    { ...validConsole(), stateVersion: -1 },
    { ...validConsole(), state: 'RUNNING' },
    { ...validConsole(), requiredApproval: 'NONE' },
    { ...validConsole(), attemptNumber: 2 },
    { ...validConsole(), predecessorRunId: OTHER_RUN_ID },
    { ...validConsole(), attemptNumber: 2, predecessorRunId: RUN_ID },
    { ...validConsole(), assignedAt: '2026-02-30T09:00:00Z' },
    { ...validConsole(), capability: '  ' },
  ])(
    'fails closed for malformed or mismatched console snapshots',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () => jsonResponse(body));
      await expect(
        createRunSupervisionClient({ fetch }).getConsole(
          consoleQuery,
          signal(),
        ),
      ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('accepts a successor with a distinct predecessor and ignores undisclosed server fields', async () => {
    const console = {
      ...validConsole(),
      attemptNumber: 2,
      predecessorRunId: OTHER_RUN_ID,
    };
    const client = createRunSupervisionClient({
      fetch: async () =>
        jsonResponse({ ...console, privateProviderPayload: 'never cached' }),
    });
    await expect(client.getConsole(consoleQuery, signal())).resolves.toEqual({
      ok: true,
      console,
    });
  });

  it.each([
    [
      401,
      'browser-authentication-required',
      '/bff/login',
      'authentication-required',
    ],
    [403, 'human-actor-not-registered', undefined, 'actor-not-registered'],
    [403, 'untrusted-human-identity-issuer', undefined, 'identity-rejected'],
    [
      403,
      'invalid-authenticated-human-identity',
      undefined,
      'identity-rejected',
    ],
    [403, 'unknown', undefined, 'forbidden'],
    [400, 'invalid-assigned-resolution-run-page', undefined, 'invalid-page'],
    [404, 'assigned-resolution-run-not-found', undefined, 'not-found'],
    [
      503,
      'browser-authentication-unavailable',
      undefined,
      'authentication-unavailable',
    ],
  ] as const)(
    'classifies permanent HTTP failure %s/%s without private detail or retry',
    async (status, type, signInPath, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () =>
          jsonResponse(
            {
              type: `urn:ergon:problem:${type}`,
              signInPath,
              detail: 'private details',
            },
            status,
          ),
        );
      await expect(
        createRunSupervisionClient({ fetch }).getConsole(
          consoleQuery,
          signal(),
        ),
      ).resolves.toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('does not accept an arbitrary sign-in redirect', async () => {
    const client = createRunSupervisionClient({
      fetch: async () =>
        jsonResponse(
          {
            type: 'urn:ergon:problem:browser-authentication-required',
            signInPath: 'https://attacker.example',
          },
          401,
        ),
    });
    await expect(client.listAssigned(listQuery, signal())).resolves.toEqual({
      ok: false,
      error: { kind: 'unexpected-http-status', status: 401 },
    });
  });

  it('retries generic transient server failures once and does not retain raw error bodies', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ detail: 'private' }, 503))
      .mockResolvedValueOnce(jsonResponse(validPage()));
    await expect(
      createRunSupervisionClient({ fetch }).listAssigned(listQuery, signal()),
    ).resolves.toEqual({ ok: true, page: validPage() });
    expect(fetch).toHaveBeenCalledTimes(2);
    const unavailable = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => jsonResponse({ detail: 'private' }, 502));
    await expect(
      createRunSupervisionClient({ fetch: unavailable }).getConsole(
        consoleQuery,
        signal(),
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'service-unavailable', status: 502 },
    });
    expect(unavailable).toHaveBeenCalledTimes(2);
  });

  it('retries transport rejection once and omits the raw cause', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError('private network details'));
    await expect(
      createRunSupervisionClient({ fetch }).listAssigned(listQuery, signal()),
    ).resolves.toEqual({ ok: false, error: { kind: 'transport' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('classifies unreadable successful JSON as invalid without retry', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () => new Response('not json', { status: 200 }),
      );
    await expect(
      createRunSupervisionClient({ fetch }).getConsole(consoleQuery, signal()),
    ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('bounds each attempt deadline and aborts both timed-out transports', async () => {
    vi.useFakeTimers();
    const aborts: AbortSignal[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation((_input, init) => {
        if (init?.signal) aborts.push(init.signal);
        return new Promise<Response>(() => undefined);
      });
    const result = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 100,
    }).listAssigned(listQuery, signal());
    await vi.advanceTimersByTimeAsync(250);
    await expect(result).resolves.toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(aborts.every((attemptSignal) => attemptSignal.aborted)).toBe(true);
  });

  it('cancels before fetch begins and converts a mid-fetch abort race', async () => {
    const before = new AbortController();
    before.abort();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(validPage()));
    await expect(
      createRunSupervisionClient({ fetch }).listAssigned(
        listQuery,
        before.signal,
      ),
    ).resolves.toEqual({ ok: false, error: { kind: 'request-cancelled' } });
    expect(fetch).not.toHaveBeenCalled();

    const during = new AbortController();
    let signalStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const interrupted = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
          signalStarted?.();
        }),
    );
    const result = createRunSupervisionClient({
      fetch: interrupted,
    }).getConsole(consoleQuery, during.signal);
    await started;
    during.abort();
    await expect(result).resolves.toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(interrupted).toHaveBeenCalledOnce();
  });

  it('allows unexpected decoding defects to reject', async () => {
    const response = jsonResponse(validPage());
    Object.defineProperty(response, 'status', {
      get: () => {
        throw new Error('unexpected decoder defect');
      },
    });
    const client = createRunSupervisionClient({ fetch: async () => response });
    await expect(client.listAssigned(listQuery, signal())).rejects.toThrow(
      'unexpected decoder defect',
    );
  });

  it.each([200, 503])(
    'cancels during response-body reading without reporting invalid JSON or HTTP failure (%s)',
    async (status) => {
      const caller = new AbortController();
      const body = hangingBodyFetch(status);
      const result = createRunSupervisionClient({
        fetch: body.fetch,
      }).getConsole(consoleQuery, caller.signal);
      await body.started;
      caller.abort();
      await expect(result).resolves.toEqual({
        ok: false,
        error: { kind: 'request-cancelled' },
      });
      expect(body.fetch).toHaveBeenCalledOnce();
      expect(body.signals[0]?.aborted).toBe(true);
    },
  );

  it('keeps transport cancellation attached while both response bodies exceed their deadlines', async () => {
    vi.useFakeTimers();
    const body = hangingBodyFetch(200);
    const result = createRunSupervisionClient({
      fetch: body.fetch,
      requestTimeoutMs: 100,
    }).getConsole(consoleQuery, signal());
    await body.started;
    await vi.advanceTimersByTimeAsync(250);
    await expect(result).resolves.toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(body.fetch).toHaveBeenCalledTimes(2);
    expect(body.signals).toHaveLength(2);
    expect(body.signals.every((attemptSignal) => attemptSignal.aborted)).toBe(
      true,
    );
  });

  it('does not hide a synchronous decoder defect behind a simultaneous caller abort', async () => {
    const caller = new AbortController();
    const response = jsonResponse(validPage());
    Object.defineProperty(response, 'status', {
      get: () => {
        caller.abort();
        throw new Error('concurrent decoder defect');
      },
    });
    const result = createRunSupervisionClient({
      fetch: async () => response,
    }).listAssigned(listQuery, caller.signal);
    await expect(result).rejects.toThrow('concurrent decoder defect');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid deadlines %s during composition',
    (requestTimeoutMs) => {
      expect(() =>
        createRunSupervisionClient({
          fetch: globalThis.fetch,
          requestTimeoutMs,
        }),
      ).toThrow(RangeError);
    },
  );
});

/** A real streaming body whose JSON read can be interrupted after headers have arrived. */
function hangingBodyFetch(status: number): {
  readonly fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  readonly started: Promise<void>;
  readonly signals: readonly AbortSignal[];
} {
  let signalStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const signals: AbortSignal[] = [];
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (_input, init) => {
      const attemptSignal = init?.signal;
      if (attemptSignal) signals.push(attemptSignal);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          attemptSignal?.addEventListener(
            'abort',
            () => controller.error(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        },
      });
      const response = new Response(stream, { status });
      const readJson = response.json.bind(response);
      vi.spyOn(response, 'json').mockImplementation(() => {
        signalStarted?.();
        return readJson();
      });
      return response;
    });
  return { fetch, started, signals };
}
