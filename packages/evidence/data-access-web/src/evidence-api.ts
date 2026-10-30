import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  KnowledgeQuery,
  ContradictionAssessment,
  AdjudicationIntent,
  DocumentaryAdjudication,
  BundleIntent,
  DocumentaryBundle,
  EvidenceCursor,
  EvidenceInspection,
  EvidencePage,
  EvidenceQuery,
  EvidenceReceipt,
  EvidenceReviewIntent,
  EvidenceSelection,
} from '@ergon/evidence-model';
import {
  normalizeEvidenceFailure,
  type EvidenceClient,
  type EvidenceFailure,
  type EvidenceResult,
} from './evidence-client';
import {
  parseAssessment,
  parseAdjudication,
  parseBundle,
} from './knowledge-schema';
import { parseInspection, parsePage, parseReceipt } from './evidence-schema';

export interface EvidenceDependencies {
  readonly evidenceClient: EvidenceClient;
}
/** Per-disclosure RTK cache only. The app aborts queries/mutations and resets after unmount; no persistence or polling. */
export const evidenceApi = createApi({
  reducerPath: 'evidenceApi',
  baseQuery: fakeBaseQuery<EvidenceFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (build) => ({
    assessment: build.query<ContradictionAssessment, KnowledgeQuery>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (c) => c.assess(q, api.signal),
          (v) => parseAssessment(v, q.id),
        ),
    }),
    adjudication: build.query<DocumentaryAdjudication, KnowledgeQuery>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (c) => c.adjudication(q, api.signal),
          (v) => parseAdjudication(v, q),
        ),
    }),
    bundle: build.query<DocumentaryBundle, KnowledgeQuery>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (c) => c.bundle(q, api.signal),
          (v) => parseBundle(v, q),
        ),
    }),
    adjudicate: build.mutation<DocumentaryAdjudication, AdjudicationIntent>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (c) => c.adjudicate(q, api.signal),
          (v) => parseAdjudication(v, q, q),
        ),
    }),
    publish: build.mutation<DocumentaryBundle, BundleIntent>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (c) => c.publish(q, api.signal),
          (v) => parseBundle(v, q, q),
        ),
    }),
    pending: build.query<
      EvidencePage,
      EvidenceQuery & { readonly cursor: EvidenceCursor | null }
    >({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (client) => client.pending(q, api.signal),
          (value) => parsePage(value, q.cursor),
        ),
    }),
    inspection: build.query<EvidenceInspection, EvidenceSelection>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (client) => client.inspect(q, api.signal),
          (value) => parseInspection(value, q),
        ),
    }),
    review: build.mutation<EvidenceReceipt, EvidenceReviewIntent>({
      queryFn: (q, api) =>
        safely(
          api.extra,
          (client) => client.review(q, api.signal),
          (value) => parseReceipt(value, q),
        ),
    }),
  }),
});
async function safely<T>(
  extra: unknown,
  call: (client: EvidenceClient) => Promise<EvidenceResult<T>>,
  parse: (value: unknown) => T | undefined,
): Promise<{ data: T } | { error: EvidenceFailure }> {
  try {
    if (
      typeof extra !== 'object' ||
      extra === null ||
      !('evidenceClient' in extra)
    )
      return { error: { kind: 'unexpected-defect' } };
    const result = await call(extra.evidenceClient as EvidenceClient);
    if (
      typeof result !== 'object' ||
      result === null ||
      (result.ok !== true && result.ok !== false)
    )
      return { error: { kind: 'unexpected-defect' } };
    if (!result.ok) return { error: normalizeEvidenceFailure(result.error) };
    const value = parse(result.value);
    return value === undefined
      ? { error: { kind: 'unexpected-defect' } }
      : { data: value };
  } catch {
    return { error: { kind: 'unexpected-defect' } };
  }
}
