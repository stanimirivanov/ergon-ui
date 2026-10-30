import { configureStore } from '@reduxjs/toolkit';
import { expect, it, vi } from 'vitest';
import { createEvidenceClient } from '../src/evidence-client';
import { evidenceApi } from '../src/evidence-api';
import {
  parseAssessment,
  parseAdjudication,
  parseBundle,
} from '../src/knowledge-schema';
import { actorId, tenantId } from './fixtures';
import {
  assessment,
  anchor,
  second,
  adjudication,
  adjudicationIntent,
  bundle,
  publication,
} from './knowledge-fixtures';
const query = { ...publication };
const signal = (): AbortSignal => new AbortController().signal;
it('decodes complete cited assessments and rejects missing, reordered, unaccepted or forged comparisons', () => {
  expect(parseAssessment(assessment, anchor)).toEqual(assessment);
  for (const value of [
    { ...assessment, candidates: assessment.candidates.slice(0, 1) },
    { ...assessment, candidates: [...assessment.candidates].reverse() },
    { ...assessment, findings: [] },
    { ...assessment, state: 'NO_DETECTED_CONFLICT' },
    { ...assessment, hasUndetermined: true },
    {
      ...assessment,
      findings: [{ left: anchor, right: second, comparison: 'COMPATIBLE' }],
    },
    {
      ...assessment,
      candidates: assessment.candidates.map((c) => ({
        ...c,
        claim: { ...c.claim, status: 'REJECTED' },
      })),
    },
    {
      ...assessment,
      candidates: assessment.candidates.map((c) => ({
        ...c,
        claim: { ...c.claim, input: { ...c.claim.input, scope: 'other' } },
      })),
    },
  ])
    expect(parseAssessment(value, anchor)).toBeUndefined();
  expect(parseAssessment(assessment, tenantId)).toBeUndefined();
});
it('preserves unknown singleton validity and microsecond interval distinctions without inventing consistency', () => {
  const candidates = assessment.candidates.map((c) => ({
    ...c,
    claim: {
      ...c.claim,
      input: { ...c.claim.input, validFrom: null, validUntil: null },
    },
  }));
  expect(
    parseAssessment(
      {
        ...assessment,
        candidates,
        state: 'UNDETERMINED',
        hasUndetermined: true,
        findings: [{ left: anchor, right: second, comparison: 'UNDETERMINED' }],
      },
      anchor,
    )?.hasUndetermined,
  ).toBe(true);
  expect(
    parseAssessment(
      {
        ...assessment,
        candidates: candidates.slice(0, 1),
        state: 'INSUFFICIENT_CANDIDATES',
        findings: [],
      },
      anchor,
    )?.candidates[0]?.claim.input.validFrom,
  ).toBeNull();
  expect(
    parseAssessment(
      {
        ...assessment,
        candidates: assessment.candidates.map((c, i) => ({
          ...c,
          claim: {
            ...c.claim,
            input: {
              ...c.claim.input,
              validFrom:
                i === 0
                  ? '2026-10-29T12:00:00.000001Z'
                  : '2026-10-29T12:00:00.000002Z',
              validUntil:
                i === 0
                  ? '2026-10-29T12:00:00.000002Z'
                  : '2026-10-29T12:00:00.000003Z',
            },
          },
        })),
        state: 'NO_DETECTED_CONFLICT',
        findings: [
          { left: anchor, right: second, comparison: 'DISJOINT_VALIDITY' },
        ],
      },
      anchor,
    ),
  ).toBeDefined();
});
it('validates exact adjudication acknowledgements, strips proofs, and keeps historical decisions explicit', () => {
  expect(
    parseAdjudication(
      { ...adjudication, authorityEvidenceId: 'private' },
      { ...query, id: adjudication.id },
      adjudicationIntent,
    ),
  ).toEqual(adjudication);
  expect(
    parseAdjudication(
      { ...adjudication, current: false },
      { ...query, id: adjudication.id },
    )?.current,
  ).toBe(false);
  for (const changed of [
    { rationale: 'Changed' },
    { reviewerId: anchor },
    { selectedClaimId: second },
    { assessment: { ...assessment, revision: 3 } },
  ])
    expect(
      parseAdjudication(
        { ...adjudication, ...changed },
        { ...query, id: adjudication.id },
        adjudicationIntent,
      ),
    ).toBeUndefined();
});
it('validates historical bundle relationships and exact publication intent without requalifying history', () => {
  expect(
    parseBundle(
      { ...bundle, authorityEvidenceId: 'private' },
      query,
      publication,
    ),
  ).toEqual(bundle);
  for (const changed of [
    { id: anchor },
    { publishedBy: anchor },
    { manifest: { ...bundle.manifest, tenantId: anchor } },
    { manifest: { ...bundle.manifest, assessedAt: '2026-10-29T12:00:04Z' } },
    { manifest: { ...bundle.manifest, sources: [] } },
    {
      manifest: {
        ...bundle.manifest,
        proposals: bundle.manifest.proposals.map((p) => ({
          ...p,
          selected: true,
        })),
      },
    },
    { manifest: { ...bundle.manifest, claimSets: [] } },
  ])
    expect(
      parseBundle({ ...bundle, ...changed }, query, publication),
    ).toBeUndefined();
  expect(
    parseBundle(
      { ...bundle, manifest: { ...bundle.manifest, schema: 'unknown' } },
      query,
    ),
  ).toBeUndefined();
});
it('uses exact bodies, fresh CSRF on explicit replay, no automatic retries and bounded same-origin transport', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Response.json(
      String(url).endsWith('/csrf')
        ? { headerName: 'X-CSRF-TOKEN', token: 'fresh' }
        : String(url).includes('/adjudications/')
          ? { ...adjudication, authorityEvidenceId: 'secret' }
          : bundle,
    );
  });
  const client = createEvidenceClient({ fetch });
  expect((await client.adjudicate(adjudicationIntent, signal())).ok).toBe(true);
  expect((await client.adjudicate(adjudicationIntent, signal())).ok).toBe(true);
  expect((await client.publish(publication, signal())).ok).toBe(true);
  expect(calls).toHaveLength(6);
  expect(calls[1]?.url).toBe(calls[3]?.url);
  expect(calls[1]?.init.body).toBe(calls[3]?.init.body);
  expect(calls[1]?.init.headers).toEqual(calls[3]?.init.headers);
  const body = JSON.parse(String(calls[1]?.init.body)) as unknown;
  expect(body).toEqual({
    anchorId: anchor,
    expectedRevision: 2,
    candidateIds: [anchor, second],
    choice: 'PREFER_CLAIM',
    selectedClaimId: anchor,
    rationale: adjudicationIntent.rationale,
  });
  expect(
    calls.every(
      (c) =>
        c.init.credentials === 'same-origin' && c.init.cache === 'no-store',
    ),
  ).toBe(true);
  expect(calls[5]?.init.body).toBe(
    JSON.stringify({
      claims: publication.claims,
      procedures: [],
      claimSets: publication.claimSets,
    }),
  );
});
it('fails safely on denial, stale command, unsupported server and malformed acknowledgement', async () => {
  for (const [status, kind] of [
    [401, 'authentication-required'],
    [403, 'denied'],
    [404, 'denied'],
    [409, 'conflict'],
    [422, 'invalid-input'],
    [501, 'unavailable'],
  ] as const) {
    const client = createEvidenceClient({
      fetch: async () => Response.json({}, { status }),
    });
    expect(await client.assess({ ...query, id: anchor }, signal())).toEqual({
      ok: false,
      error: { kind },
    });
  }
  const client = createEvidenceClient({
    fetch: async () => Response.json({ bad: 'private' }),
  });
  expect(await client.bundle(query, signal())).toEqual({
    ok: false,
    error: { kind: 'invalid-response' },
  });
  expect(
    await client.publish(
      { ...publication, claims: [anchor, anchor] },
      signal(),
    ),
  ).toEqual({ ok: false, error: { kind: 'unexpected-defect' } });
});
it('contains injected defects at RTK and aborts retired knowledge requests', async () => {
  const client = createEvidenceClient({
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('private abort')),
        ),
      ),
  });
  const store = configureStore({
    reducer: { [evidenceApi.reducerPath]: evidenceApi.reducer },
    middleware: (d) =>
      d({
        thunk: {
          extraArgument: {
            evidenceClient: {
              ...client,
              adjudication: async () => {
                throw new Error('secret proof');
              },
            },
          },
        },
      }).concat(evidenceApi.middleware),
  });
  const read = store.dispatch(
    evidenceApi.endpoints.adjudication.initiate({
      ...query,
      id: adjudication.id,
    }),
  );
  expect((await read).error).toEqual({ kind: 'unexpected-defect' });
  const pending = store.dispatch(
    evidenceApi.endpoints.assessment.initiate({ ...query, id: anchor }),
  );
  pending.abort();
  await pending;
  store.dispatch(evidenceApi.util.resetApiState());
  expect(JSON.stringify(store.getState())).not.toContain('secret');
  expect(actorId).not.toBe(tenantId);
});
