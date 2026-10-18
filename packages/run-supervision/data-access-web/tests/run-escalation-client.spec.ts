import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  normalizeRunEscalationFailure,
} from '../src';
import {
  escalationCommand as command,
  escalationQuery as query,
  escalationReceipt as receipt,
  escalationReview as review,
} from './run-escalation-fixtures';
import { jsonResponse } from './run-supervision-fixtures';
const signal = (): AbortSignal => new AbortController().signal;
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral' };
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bounded escalation HTTP boundary', () => {
  it('retries a transient private read once without exposing raw causes', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(review));
    expect(
      await createRunSupervisionClient({ fetch }).getEscalationReview(
        query,
        signal(),
      ),
    ).toEqual({ ok: true, review });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(fetch.mock.calls[1]?.[0]).toContain('/escalation-review');
  });
  it.each([200, 201])(
    'binds HTTP %s creation/replay and sends only reviewed wire fields',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse({ ...receipt, actorId: 'PRIVATE' }, status),
        );
      const input = { ...command, authorityEvidenceId: 'PRIVATE' };
      expect(
        await createRunSupervisionClient({ fetch }).escalateRun(
          input,
          signal(),
        ),
      ).toEqual({ ok: true, receipt });
      const post = fetch.mock.calls[1];
      expect(post?.[0]).toContain('/escalation-commands');
      expect(post?.[1]).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': csrf.token },
      });
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        commandId: command.commandId,
        expectedSupervisionRevision: 3,
        expectedRunVersion: 1,
        sourceAttemptNumber: 2,
        retryPolicyRevision: command.retryPolicyRevision,
        maximumAttempts: 2,
        reason: command.reason,
      });
    },
  );
  it('never retries CSRF/POST automatically; explicit replay preserves intent with fresh CSRF', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse({ ...csrf, token: 'new' }))
      .mockResolvedValueOnce(jsonResponse(receipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.escalateRun(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.escalateRun(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[3]?.[1]?.body);
    expect(fetch.mock.calls[3]?.[1]?.headers).toMatchObject({
      'X-CSRF-TOKEN': 'new',
    });
  });
  it('rejects invalid intent and pre-aborted work without network acquisition', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = createRunSupervisionClient({ fetch });
    expect(
      await client.escalateRun({ ...command, maximumAttempts: 3 }, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-escalation' } });
    const controller = new AbortController();
    controller.abort();
    expect(await client.escalateRun(command, controller.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [409, 'run-escalation-conflict', 'escalation-conflict'],
    [503, 'run-escalation-disabled', 'escalation-disabled'],
    [503, 'run-escalation-unavailable', 'escalation-unavailable'],
    [400, 'invalid-run-escalation', 'invalid-escalation'],
    [404, 'assigned-resolution-run-not-found', 'not-found'],
    [404, 'route-not-found', 'escalation-unsupported'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
  ])('maps stable failure %s %s', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse(
          { type: `urn:ergon:problem:${type}`, detail: 'PRIVATE' },
          Number(status),
        ),
      );
    expect(
      await createRunSupervisionClient({ fetch }).getEscalationReview(
        query,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('contains an aborted fetch rejection as cancellation', async () => {
    const controller = new AbortController();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => {
        controller.abort();
        throw new DOMException('PRIVATE', 'AbortError');
      });
    expect(
      await createRunSupervisionClient({ fetch }).getEscalationReview(
        query,
        controller.signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'request-cancelled' } });
  });
  it('bounds the entire CSRF plus hanging POST body, physically aborting it without automatic retries', async () => {
    vi.useFakeTimers();
    let bodySignal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockImplementationOnce(async (_url, options) => {
        bodySignal = options?.signal;
        return new Response(
          new ReadableStream({
            start() {
              /* Deliberately never complete the body. */
            },
          }),
          { status: 201 },
        );
      });
    const pending = createRunSupervisionClient({
      fetch,
      requestTimeoutMs: 20,
    }).escalateRun(command, signal());
    await vi.advanceTimersByTimeAsync(30);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(bodySignal?.aborted).toBe(true);
  });
  it('normalizes safe failures without private extras and keeps defects distinct', () => {
    expect(
      normalizeRunEscalationFailure({
        kind: 'escalation-conflict',
        cause: 'PRIVATE',
      }),
    ).toEqual({ kind: 'escalation-conflict' });
    expect(normalizeRunEscalationFailure(new Error('PRIVATE'))).toEqual({
      kind: 'unexpected-defect',
    });
  });
});
