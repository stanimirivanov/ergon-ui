import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient, normalizeRunRetryFailure } from '../src';
import {
  retryCommand,
  retryQuery,
  retryReceipt,
  retryReview,
} from './run-retry-fixtures';
import { jsonResponse } from './run-supervision-fixtures';

const signal = (): AbortSignal => new AbortController().signal;
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral-retry-token' };
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bounded supervisor retry HTTP boundary', () => {
  it('strips caller extras before sending any nested wire fields', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(jsonResponse(retryReceipt));
    const intent = {
      ...retryCommand,
      authorityEvidenceId: 'PRIVATE',
      plan: { ...retryCommand.plan, rawEvidence: 'PRIVATE' },
    };
    expect(
      (await createRunSupervisionClient({ fetch }).retryRun(intent, signal()))
        .ok,
    ).toBe(true);
    expect(String(fetch.mock.calls[1]?.[1]?.body)).not.toContain('PRIVATE');
    expect(String(fetch.mock.calls[1]?.[1]?.body)).not.toContain(
      'expectedAttemptNumber',
    );
  });
  it('reads narrow review on demand and retries only classified transient reads', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(retryReview));
    expect(
      await createRunSupervisionClient({ fetch }).getRetryReview(
        retryQuery,
        signal(),
      ),
    ).toEqual({ ok: true, review: retryReview });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(fetch.mock.calls[1]?.[0]).toContain('/retry-review');
  });
  it.each([200, 201])(
    'accepts exact historical replay/new receipt at HTTP %s and sends no local or private extras',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse(
            { ...retryReceipt, authorityEvidenceId: 'PRIVATE' },
            status,
          ),
        );
      expect(
        await createRunSupervisionClient({ fetch }).retryRun(
          { ...retryCommand, plan: { ...retryCommand.plan } },
          signal(),
        ),
      ).toEqual({ ok: true, receipt: retryReceipt });
      const post = fetch.mock.calls[1];
      expect(post?.[0]).toContain('/retry-commands');
      expect(post?.[1]).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': csrf.token },
      });
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        commandId: retryCommand.commandId,
        expectedSupervisionRevision: 3,
        expectedRunVersion: 1,
        retryPolicyRevision: retryCommand.retryPolicyRevision,
        maximumAttempts: 2,
        plan: retryCommand.plan,
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('replays the unchanged wire intent with fresh invocation-local CSRF and never retries a command automatically', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse({ ...csrf, token: 'next-token' }))
      .mockResolvedValueOnce(jsonResponse(retryReceipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.retryRun(retryCommand, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.retryRun(retryCommand, signal())).toEqual({
      ok: true,
      receipt: retryReceipt,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[3]?.[1]?.body);
    expect(fetch.mock.calls[3]?.[1]?.headers).toMatchObject({
      'X-CSRF-TOKEN': 'next-token',
    });
  });
  it('rejects invalid intent and pre-aborted calls before any CSRF/network work', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = createRunSupervisionClient({ fetch });
    expect(
      await client.retryRun({ ...retryCommand, maximumAttempts: 1 }, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-retry' } });
    const controller = new AbortController();
    controller.abort();
    expect(await client.retryRun(retryCommand, controller.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [409, 'run-retry-conflict', 'retry-conflict'],
    [503, 'run-retry-disabled', 'retry-disabled'],
    [503, 'run-retry-unavailable', 'retry-unavailable'],
    [400, 'invalid-run-retry', 'invalid-retry'],
    [404, 'assigned-resolution-run-not-found', 'not-found'],
    [404, 'route-not-found', 'retry-unsupported'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
  ])(
    'maps only stable status/type meaning: %s %s',
    async (status, type, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          jsonResponse(
            { type: `urn:ergon:problem:${type}`, detail: 'PRIVATE' },
            status,
          ),
        );
      expect(
        await createRunSupervisionClient({ fetch }).getRetryReview(
          retryQuery,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('includes CSRF and body work in the same deadline and physically aborts acquired requests', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    const result = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 20,
    }).retryRun(retryCommand, signal());
    await vi.advanceTimersByTimeAsync(25);
    expect(await result).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.every(([, init]) => init?.signal?.aborted)).toBe(
      true,
    );
  });
  it('does not turn an invalid receipt or unknown failure into success or raw diagnostics', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(
        jsonResponse({ ...retryReceipt, sourceAttemptNumber: 2 }),
      );
    expect(
      await createRunSupervisionClient({ fetch }).retryRun(
        retryCommand,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(normalizeRunRetryFailure(new Error('PRIVATE'))).toEqual({
      kind: 'unexpected-defect',
    });
    expect(
      normalizeRunRetryFailure({ kind: 'retry-conflict', cause: 'PRIVATE' }),
    ).toEqual({ kind: 'retry-conflict' });
  });
});
