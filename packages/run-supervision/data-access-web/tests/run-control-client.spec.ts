import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import {
  decodeRunControlReceipt,
  decodeRunControlView,
} from '../src/bff/run-control-schemas';

const query = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  expectedSupervisionRevision: 7,
};
const control = {
  leaseId: '33333333-3333-4333-8333-333333333333',
  revision: 1,
};
const intent = {
  ...query,
  commandId: '44444444-4444-4444-8444-444444444444',
  action: 'ACQUIRE' as const,
};
const times = {
  observedAt: '2026-10-19T08:00:00Z',
  expiresAt: '2026-10-19T08:02:00Z',
};
const receipt = {
  commandId: intent.commandId,
  runId: query.runId,
  action: 'ACQUIRE',
  supervisionRevision: 7,
  control,
  changedAt: times.observedAt,
  expiresAt: times.expiresAt,
  recordedAt: '2026-10-19T08:00:01Z',
};
const signal = () => new AbortController().signal;
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('browser control protocol', () => {
  it('decodes status variants, strips private fields and fails closed on epoch/fence/duration mismatch', () => {
    expect(
      decodeRunControlView(
        {
          status: 'DISABLED',
          supervisionRevision: 7,
          ...times,
          holderId: 'private',
        },
        query,
      ),
    ).toEqual({
      status: 'DISABLED',
      supervisionRevision: 7,
      observedAt: times.observedAt,
    });
    for (const status of ['AVAILABLE', 'EXPIRED', 'TERMINAL'])
      expect(
        decodeRunControlView(
          { status, supervisionRevision: 7, ...times, fence: null },
          query,
        )?.status,
      ).toBe(status);
    expect(
      decodeRunControlView(
        {
          status: 'ANOTHER_SESSION',
          supervisionRevision: 7,
          ...times,
          fence: control,
        },
        query,
      ),
    ).toBeUndefined();
    expect(
      decodeRunControlView(
        {
          status: 'THIS_SESSION',
          supervisionRevision: 8,
          ...times,
          fence: control,
        },
        query,
      ),
    ).toBeUndefined();
    expect(
      decodeRunControlView(
        {
          status: 'THIS_SESSION',
          supervisionRevision: 7,
          ...times,
          fence: { ...control, revision: 0 },
        },
        query,
      ),
    ).toBeUndefined();
    expect(
      decodeRunControlView(
        {
          status: 'THIS_SESSION',
          supervisionRevision: 7,
          ...times,
          expiresAt: '2026-10-19T08:03:00Z',
          fence: control,
        },
        query,
      ),
    ).toBeUndefined();
  });
  it('validates exact historical receipt and renewal fence without ordering database time', () => {
    expect(decodeRunControlReceipt(receipt, intent)).toEqual(receipt);
    expect(
      decodeRunControlReceipt({ ...receipt, runId: control.leaseId }, intent),
    ).toBeUndefined();
    expect(
      decodeRunControlReceipt(
        { ...receipt, action: 'RENEW', control: { ...control, revision: 2 } },
        { ...intent, action: 'RENEW', control },
      ),
    ).toBeUndefined();
    expect(
      decodeRunControlReceipt(
        { ...receipt, expiresAt: '2026-10-19T08:01:59Z' },
        intent,
      ),
    ).toBeUndefined();
  });
  it('uses fresh CSRF for exact explicit replay without automatically retrying a lost mutation', async () => {
    const bodies: unknown[] = [];
    let csrf = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      expect(init?.credentials).toBe('same-origin');
      expect(init?.cache).toBe('no-store');
      if (url === '/bff/v1/csrf') {
        csrf++;
        return json({ headerName: 'X-CSRF-TOKEN', token: 'synthetic' });
      }
      expect(new Headers(init?.headers).get('X-CSRF-TOKEN')).toBe('synthetic');
      bodies.push(JSON.parse(String(init?.body)));
      if (bodies.length === 1) throw new TypeError('private sentinel');
      return json(receipt);
    });
    const client = createRunSupervisionClient({ fetch });
    expect(await client.changeRunControl(intent, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(bodies).toHaveLength(1);
    expect(await client.changeRunControl(intent, signal())).toEqual({
      ok: true,
      value: receipt,
    });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(csrf).toBe(2);
  });
  it('does not treat missing routes or conflicts as disabled and does not disclose response details', async () => {
    for (const [status, type, kind] of [
      [409, 'run-control-required', 'control-required'],
      [409, 'run-control-conflict', 'control-conflict'],
      [503, 'run-control-disabled', 'control-disabled'],
      [503, 'run-control-unavailable', 'control-unavailable'],
      [404, 'unknown', 'unexpected-http-status'],
    ] as const) {
      const fetch = vi.fn<typeof globalThis.fetch>(async () =>
        json(
          { type: 'urn:ergon:problem:' + type, detail: 'private sentinel' },
          status,
        ),
      );
      const result = await createRunSupervisionClient({ fetch }).getRunControl(
        query,
        signal(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe(kind);
      expect(JSON.stringify(result)).not.toContain('sentinel');
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it('rejects malformed intent before transport and respects an already aborted caller', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = createRunSupervisionClient({ fetch });
    expect(
      (
        await client.changeRunControl(
          { ...intent, action: 'RENEW', control: { ...control, revision: -1 } },
          signal(),
        )
      ).ok,
    ).toBe(false);
    const abort = new AbortController();
    abort.abort();
    expect(await client.getRunControl(query, abort.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
