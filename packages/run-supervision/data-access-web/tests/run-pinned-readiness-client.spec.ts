import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import { normalizeInspectionFailure } from '../src/bff/run-inspection-http';
import {
  readinessExample as example,
  readinessQuery as query,
} from './pinned-readiness-fixtures';
import { jsonResponse, TENANT_ID } from './run-supervision-fixtures';

const signal = () => new AbortController().signal;
const selected = example.selectedEvidence[0];

describe('pinned readiness protocol', () => {
  it('uses only exact protected GET, preserves stream-selected backsteps beyond the cap and strips private extras', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ...example,
        privateCause: 'PRIVATE',
        selectedEvidence: example.selectedEvidence.map((fact) => ({
          ...fact,
          secret: 'PRIVATE',
          source: { ...fact.source, actorId: 'PRIVATE' },
        })),
      }),
    );
    expect(
      await createRunSupervisionClient({ fetch }).getPinnedReadiness(
        query,
        signal(),
      ),
    ).toEqual({ ok: true, value: example });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/pinned-readiness`,
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
  });
  it('preserves missing precedence and declaration order, and exact case-sensitive mismatch', async () => {
    const waiting = {
      ...example,
      status: 'WAITING_FOR_EVIDENCE',
      applicability: null,
      missingEvidence: ['z.state', 'a.state'],
    };
    const mismatch = {
      ...example,
      status: 'NOT_APPLICABLE',
      applicability: { ...example.applicability, expectedValue: 'locked' },
    };
    for (const body of [
      waiting,
      mismatch,
      {
        ...waiting,
        selectedEvidence: [],
        missingEvidence: ['account.access.state'],
      },
    ]) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(jsonResponse(body));
      expect(
        await createRunSupervisionClient({ fetch }).getPinnedReadiness(
          query,
          signal(),
        ),
      ).toEqual({ ok: true, value: body });
    }
  });
  it.each([
    { ...example, runId: TENANT_ID },
    { ...example, caseId: TENANT_ID },
    { ...example, caseStreamVersion: 206 },
    { ...example, supervisionRevision: 4 },
    { ...example, contractKey: 'latest' },
    { ...example, contractRevision: 2 },
    { ...example, evaluator: 'unknown/v2' },
    { ...example, observedAt: 'not-an-instant' },
    { ...example, status: 'READY', applicability: null },
    { ...example, status: 'WAITING_FOR_EVIDENCE', applicability: null },
    { ...example, missingEvidence: ['other.state'] },
    {
      ...example,
      status: 'WAITING_FOR_EVIDENCE',
      applicability: null,
      missingEvidence: ['other.state', 'other.state'],
    },
    {
      ...example,
      status: 'WAITING_FOR_EVIDENCE',
      applicability: null,
      missingEvidence: ['account.access.state'],
    },
    { ...example, status: 'NOT_APPLICABLE' },
    {
      ...example,
      applicability: {
        fact: 'account.access.state',
        expectedValue: 'LOCKED',
        actualValue: 'ACTIVE',
      },
    },
    { ...example, selectedEvidence: [] },
    { ...example, selectedEvidence: [selected, selected] },
    { ...example, selectedEvidence: [{ ...selected, streamVersion: 206 }] },
    { ...example, selectedEvidence: [{ ...selected, streamVersion: 202 }] },
    {
      ...example,
      selectedEvidence: [{ ...selected, accountReference: 'another-account' }],
    },
    { ...example, selectedEvidence: [{ ...selected, factId: 'not-a-uuid' }] },
    {
      ...example,
      selectedEvidence: [
        {
          ...selected,
          source: { ...selected?.source, content: 'x'.repeat(8001) },
        },
      ],
    },
  ])(
    'rejects inconsistent attribution/status once without partial data %#',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(jsonResponse(body));
      expect(
        await createRunSupervisionClient({ fetch }).getPinnedReadiness(
          query,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('accepts fifty ordered missing names, rejects fifty-one, and invalid expectations never reach I/O', async () => {
    for (const size of [50, 51]) {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        jsonResponse({
          ...example,
          status: 'WAITING_FOR_EVIDENCE',
          applicability: null,
          missingEvidence: Array.from(
            { length: size },
            (_, i) => 'missing.fact-' + i,
          ),
        }),
      );
      expect(
        (
          await createRunSupervisionClient({ fetch }).getPinnedReadiness(
            query,
            signal(),
          )
        ).ok,
      ).toBe(size === 50);
    }
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(
      await createRunSupervisionClient({ fetch }).getPinnedReadiness(
        { ...query, caseStreamVersion: 0 },
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-page' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [404, 'urn:ergon:problem:assigned-resolution-run-not-found', 'not-found'],
    [404, 'about:blank', 'readiness-unsupported'],
    [405, 'about:blank', 'readiness-unsupported'],
    [501, 'about:blank', 'readiness-unsupported'],
    [
      403,
      'urn:ergon:problem:human-actor-not-registered',
      'actor-not-registered',
    ],
    [
      503,
      'urn:ergon:problem:browser-authentication-unavailable',
      'authentication-unavailable',
    ],
  ])('retains safe failure semantics %s %s', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ type, detail: 'PRIVATE' }, status));
    expect(
      await createRunSupervisionClient({ fetch }).getPinnedReadiness(
        query,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
  });
  it('retries transient reads once, includes body work in deadline, and cancels held transport', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(example));
    expect(
      (
        await createRunSupervisionClient({ fetch }).getPinnedReadiness(
          query,
          signal(),
        )
      ).ok,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    const hangingBody = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response(
          new ReadableStream({
            start() {
              /* Deliberately no body completion. */
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    );
    expect(
      await createRunSupervisionClient({
        fetch: hangingBody,
        requestTimeoutMs: 20,
      }).getPinnedReadiness(query, signal()),
    ).toEqual({ ok: false, error: { kind: 'timeout' } });
    const controller = new AbortController();
    let started: () => void = () => undefined;
    const acquired = new Promise<void>((resolve) => {
      started = resolve;
    });
    const held = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('PRIVATE', 'AbortError')),
          );
          started();
        }),
    );
    const result = createRunSupervisionClient({
      fetch: held,
    }).getPinnedReadiness(query, controller.signal);
    await acquired;
    controller.abort();
    expect(await result).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });
  it('normalizes private and hostile failures without diagnostics', () => {
    expect(
      normalizeInspectionFailure(
        { kind: 'readiness-unsupported', cause: 'PRIVATE' },
        'readiness-unsupported',
      ),
    ).toEqual({ kind: 'readiness-unsupported' });
    expect(
      normalizeInspectionFailure(
        {
          get kind() {
            throw Error('PRIVATE');
          },
        },
        'readiness-unsupported',
      ),
    ).toEqual({ kind: 'unexpected-defect' });
  });
});
