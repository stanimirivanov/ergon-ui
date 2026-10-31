import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Either, Schema } from 'effect';
import type {
  EvaluationHistoryQuery,
  EvaluationReportQuery,
  EvaluationPage,
  EvaluationReport,
} from '@ergon/evaluation-model';
import type {
  EvaluationClient,
  EvaluationFailure,
} from './evaluation-contract';
import {
  parseEvaluationPage,
  parseEvaluationReport,
} from './evaluation-schema';
const failure = Schema.Struct({
  kind: Schema.Literal(
    'authentication-required',
    'denied',
    'unavailable',
    'transport',
    'timeout',
    'request-cancelled',
    'invalid-response',
    'unexpected-defect',
  ),
});
/** Closed failure values prevent transport diagnostics from entering state or rendering. */
export function normalizeEvaluationFailure(value: unknown): EvaluationFailure {
  const parsed = Schema.decodeUnknownEither(failure)(value);
  return Either.isRight(parsed) ? parsed.right : { kind: 'unexpected-defect' };
}
export interface EvaluationDependencies {
  readonly evaluationClient: EvaluationClient;
}
function client(value: unknown): EvaluationClient | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('evaluationClient' in value)
  )
    return undefined;
  const c = value.evaluationClient;
  return typeof c === 'object' &&
    c !== null &&
    'read' in c &&
    typeof c.read === 'function'
    ? (c as EvaluationClient)
    : undefined;
}
async function read<T>(
  query: EvaluationHistoryQuery | EvaluationReportQuery,
  api: { extra: unknown; signal: AbortSignal },
  parse: (value: unknown) => T | undefined,
): Promise<{ data: T } | { error: EvaluationFailure }> {
  try {
    const c = client(api.extra);
    if (!c) return { error: { kind: 'unexpected-defect' } };
    const result = await c.read(query, api.signal);
    if (api.signal.aborted) return { error: { kind: 'request-cancelled' } };
    if (!result.ok) return { error: normalizeEvaluationFailure(result.error) };
    const data = parse(result.value);
    return data === undefined
      ? { error: { kind: 'invalid-response' } }
      : { data };
  } catch {
    return { error: { kind: 'unexpected-defect' } };
  }
}
/** Ephemeral server cache. Host unmounts subscribers, aborts handles and resets the store on disclosure replacement. */
export const evaluationApi = createApi({
  reducerPath: 'evaluationApi',
  baseQuery: fakeBaseQuery<EvaluationFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (build) => ({
    history: build.query<EvaluationPage, EvaluationHistoryQuery>({
      queryFn: (query, api) =>
        read(query, api, (v) => parseEvaluationPage(v, query.after)),
    }),
    report: build.query<EvaluationReport, EvaluationReportQuery>({
      queryFn: (query, api) =>
        read(query, api, (v) => parseEvaluationReport(v, query.reportId)),
    }),
  }),
});
