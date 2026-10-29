import { configureStore } from '@reduxjs/toolkit';
import { expect, it, vi } from 'vitest';
import { evidenceApi } from '../src/evidence-api';
import {
  createEvidenceClient,
  type EvidenceClient,
} from '../src/evidence-client';
import {
  parseInspection,
  parsePage,
  parseReceipt,
} from '../src/evidence-schema';
import {
  actorId,
  inspection,
  intent,
  page,
  proposal,
  query,
  receipt,
  tenantId,
} from './fixtures';

it('validates complete pending cursors and rejects duplicate, wrong-kind and malformed queue entries', () => {
  expect(parsePage(page)).toEqual(page);
  const before = {
    beforeRecordedAt: proposal.recordedAt,
    beforeKind: proposal.kind,
    beforeId: proposal.id,
  };
  expect(parsePage(page, before)).toBeUndefined();
  const procedureEntry = { ...proposal, kind: 'PROCEDURE' as const };
  expect(
    parsePage({ entries: [procedureEntry, proposal], next: null }),
  ).toBeDefined();
  expect(
    parsePage({ entries: [proposal, procedureEntry], next: null }),
  ).toBeUndefined();

  expect(parsePage({ ...page, entries: [proposal, proposal] })).toBeUndefined();
  expect(
    parsePage({
      ...page,
      next: {
        beforeRecordedAt: proposal.recordedAt,
        beforeKind: 'PROCEDURE',
        beforeId: proposal.id,
      },
    }),
  ).toBeUndefined();
  expect(
    parsePage({
      entries: Array.from({ length: 21 }, () => proposal),
      next: null,
    }),
  ).toBeUndefined();
  expect(
    parsePage({ entries: [{ ...proposal, status: 'ACCEPTED' }], next: null }),
  ).toBeUndefined();
});
it('validates exact extraction, type, status/version parity, Unicode offsets and microsecond validity', () => {
  expect(parseInspection(inspection, query)).toEqual(inspection);
  expect(
    parseInspection(
      { ...inspection, claim: { ...inspection.claim, quote: '\uD800' } },
      query,
    ),
  ).toBeUndefined();
  expect(
    parseInspection(
      {
        ...inspection,
        claim: { ...inspection.claim, proposedBy: proposal.id },
      },
      query,
    ),
  ).toBeUndefined();

  expect(parseInspection({ ...inspection, version: 1 }, query)).toBeUndefined();
  expect(
    parseInspection(
      { ...inspection, target: { ...inspection.target, id: actorId } },
      query,
    ),
  ).toBeUndefined();
  expect(
    parseInspection(
      { ...inspection, claim: { ...inspection.claim, endExclusive: 2 } },
      query,
    ),
  ).toBeUndefined();
  expect(
    parseInspection(
      {
        ...inspection,
        claim: {
          ...inspection.claim,
          input: { ...inspection.claim?.input, booleanValue: 'false' },
        },
      },
      query,
    ),
  ).toBeUndefined();
  expect(
    parseInspection(
      {
        ...inspection,
        claim: {
          ...inspection.claim,
          input: {
            ...inspection.claim?.input,
            validUntil: inspection.claim?.input.validFrom,
          },
        },
      },
      query,
    ),
  ).toBeUndefined();
});
it('preserves ordered procedures and rejects out-of-order or fabricated step quotations', () => {
  const citation = {
    sourceId: proposal.sourceId,
    digest: proposal.digest,
    start: 0,
    endExclusive: 7,
    quote: '1. Read',
  };
  const selection = {
    ...query,
    proposal: { ...proposal, kind: 'PROCEDURE' as const },
  };
  const procedure = {
    id: proposal.id,
    title: 'Restore',
    extractionId: proposal.extractionId,
    compilerRevision: proposal.compilerRevision,
    observationIndex: 0,
    citation,
    steps: [{ position: 1, citation, operation: null }],
    status: 'PROPOSED',
    bindingRule: 'ordered-list-procedure-v1',
    proposedBy: actorId,
    recordedAt: proposal.recordedAt,
  };
  const value = {
    ...inspection,
    target: { ...inspection.target, kind: 'PROCEDURE' },
    claim: null,
    procedure,
  };
  expect(parseInspection(value, selection)?.procedure?.steps).toHaveLength(1);
  expect(
    parseInspection(
      {
        ...value,
        procedure: {
          ...procedure,
          steps: [{ position: 2, citation, operation: null }],
        },
      },
      selection,
    ),
  ).toBeUndefined();
  expect(
    parseInspection(
      {
        ...value,
        procedure: {
          ...procedure,
          steps: [
            {
              position: 1,
              citation: { ...citation, quote: '1. Fake' },
              operation: null,
            },
          ],
        },
      },
      selection,
    ),
  ).toBeUndefined();
});
it('strips proof identifiers, checks exact command receipts, and never sends actor hints', async () => {
  expect(
    parseReceipt({ ...receipt, authorityEvidenceId: 'PRIVATE-PROOF' }, intent),
  ).toEqual(receipt);
  expect(
    parseReceipt({ ...receipt, commandId: actorId }, intent),
  ).toBeUndefined();
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (url) =>
      String(url) === '/bff/v1/csrf'
        ? Response.json({ headerName: 'X-CSRF-TOKEN', token: 'PRIVATE-TOKEN' })
        : Response.json(
            { ...receipt, authorityEvidenceId: 'PRIVATE-PROOF' },
            { status: 201 },
          ),
    );
  const client = createEvidenceClient({ fetch });
  expect(await client.review(intent, new AbortController().signal)).toEqual({
    ok: true,
    value: receipt,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, init] = fetch.mock.calls[1] ?? [];
  expect(url).toBe(
    `/bff/v1/tenants/${tenantId}/evidence-proposals/CLAIM/${proposal.id}/reviews/${intent.commandId}`,
  );
  expect(init).toMatchObject({
    credentials: 'same-origin',
    cache: 'no-store',
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': 'PRIVATE-TOKEN' },
  });
  expect(JSON.parse(String(init?.body))).toEqual({
    extractionId: intent.extractionId,
    expectedVersion: 0,
    decision: 'ACCEPTED',
    rationale: intent.rationale,
  });
});
it('does not automatically retry writes, safely maps conflicts/denials and bounds malformed responses', async () => {
  for (const [status, kind] of [
    [409, 'conflict'],
    [404, 'denied'],
    [503, 'unavailable'],
  ] as const) {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('SECRET', { status }));
    expect(
      await createEvidenceClient({ fetch }).inspect(
        query,
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(1);
  }
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response('x'.repeat(2_097_153)));
  expect(
    await createEvidenceClient({ fetch }).inspect(
      query,
      new AbortController().signal,
    ),
  ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
});
it('cancels hung bodies under the invocation budget and validates all pagination coordinates before I/O', async () => {
  const cancelled = vi.fn();
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response(new ReadableStream({ cancel: cancelled })));
  const client = createEvidenceClient({ fetch, requestTimeout: 10 });
  expect(
    await client.pending(
      { tenantId, actorId, cursor: null },
      new AbortController().signal,
    ),
  ).toEqual({ ok: false, error: { kind: 'timeout' } });
  await vi.waitFor(() => expect(cancelled).toHaveBeenCalled());
  fetch.mockClear();
  expect(
    (
      await client.pending(
        {
          tenantId,
          actorId,
          cursor: {
            beforeId: 'bad',
            beforeKind: 'CLAIM',
            beforeRecordedAt: proposal.recordedAt,
          },
        },
        new AbortController().signal,
      )
    ).ok,
  ).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it('contains injected defects before RTK serialization and discards private data after retired handles settle', async () => {
  let finish:
    ((value: { ok: true; value: typeof inspection }) => void) | undefined;
  const inspect = vi.fn<EvidenceClient['inspect']>().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const store = configureStore({
    reducer: { [evidenceApi.reducerPath]: evidenceApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { evidenceClient: { inspect } } },
      }).concat(evidenceApi.middleware),
  });
  const request = store.dispatch(
    evidenceApi.endpoints.inspection.initiate(query),
  );
  await vi.waitFor(() => expect(finish).toBeDefined());
  request.unsubscribe();
  request.abort();
  store.dispatch(evidenceApi.util.resetApiState());
  finish?.({ ok: true, value: inspection });
  await request;
  expect(store.getState().evidenceApi.queries).toEqual({});
  inspect.mockRejectedValueOnce(new Error('SECRET'));
  const next = store.dispatch(evidenceApi.endpoints.inspection.initiate(query));
  expect((await next).error).toEqual({ kind: 'unexpected-defect' });
  expect(JSON.stringify(store.getState())).not.toContain('SECRET');
  next.unsubscribe();
  store.dispatch(evidenceApi.util.resetApiState());
});
