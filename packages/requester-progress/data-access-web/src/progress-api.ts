import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  ProgressClient,
  ProgressFailure,
  ProgressQuery,
  RequesterProgress,
} from './progress-client';
import type { RequesterQuestions } from './question-history';
import type {
  RequesterAnswerClient,
  RequesterAnswerCommand,
  RequesterAnswerFailure,
} from './answer-client';

/** Executable dependency, supplied outside serializable Redux state by the requester app. */
export interface ProgressDependencies {
  readonly progressClient: ProgressClient & RequesterAnswerClient;
}
/** Contains framework/client defects and strips diagnostics without losing command uncertainty. */
export function normalizeAnswerFailure(value: unknown): RequesterAnswerFailure {
  if (typeof value === 'object' && value !== null && 'kind' in value) {
    for (const kind of [
      'answer-conflict',
      'invalid-answer',
      'csrf-rejected',
    ] as const)
      if (value.kind === kind) return { kind };
  }
  return normalizeProgressFailure(value);
}
const kinds: readonly ProgressFailure['kind'][] = [
  'authentication-required',
  'forbidden',
  'not-found',
  'unavailable',
  'timeout',
  'transport',
  'invalid-response',
  'unexpected-response',
  'unexpected-defect',
  'request-cancelled',
];
/** Drops unknown fields and diagnostics; malformed client outcomes are defects, never invalid server responses. */
export function normalizeProgressFailure(value: unknown): ProgressFailure {
  if (typeof value === 'object' && value !== null && 'kind' in value) {
    for (const kind of kinds) if (value.kind === kind) return { kind };
  }
  return { kind: 'unexpected-defect' };
}
/** Exact tenant/case cache; zero-grace retirement cancels only after its last subscriber leaves. */
export const progressApi = createApi({
  reducerPath: 'requesterProgressApi',
  baseQuery: fakeBaseQuery<RequesterAnswerFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (build) => ({
    recordAnswer: build.mutation<
      { readonly responseId: string },
      RequesterAnswerCommand
    >({
      async queryFn(
        command,
        api,
      ): Promise<
        { data: { responseId: string } } | { error: RequesterAnswerFailure }
      > {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('progressClient' in extra)
          )
            return { error: { kind: 'unexpected-defect' } };
          const client = extra.progressClient;
          if (!isAnswerClient(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.recordAnswer(command, api.signal);
          return result.ok
            ? result.responseId === command.responseId
              ? { data: { responseId: result.responseId } }
              : { error: { kind: 'unexpected-defect' } }
            : { error: normalizeAnswerFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    questions: build.query<RequesterQuestions, ProgressQuery>({
      async queryFn(
        query,
        api,
      ): Promise<{ data: RequesterQuestions } | { error: ProgressFailure }> {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('progressClient' in extra) ||
            !isProgressClient(extra.progressClient)
          )
            return { error: { kind: 'unexpected-defect' } };
          const result = await extra.progressClient.readQuestions(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.questions }
            : { error: normalizeProgressFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    progress: build.query<RequesterProgress, ProgressQuery>({
      async queryFn(
        query,
        api,
      ): Promise<{ data: RequesterProgress } | { error: ProgressFailure }> {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('progressClient' in extra)
          )
            return { error: { kind: 'unexpected-defect' } };
          const client = extra.progressClient;
          if (!isProgressClient(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.read(query, api.signal);
          return result.ok
            ? { data: result.progress }
            : { error: normalizeProgressFailure(result.error) };
        } catch {
          // A concurrent abort does not make a thrown implementation defect safe to expose.
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
function isProgressClient(value: unknown): value is ProgressClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'read' in value &&
    typeof value.read === 'function' &&
    'readQuestions' in value &&
    typeof value.readQuestions === 'function'
  );
}
function isAnswerClient(value: unknown): value is RequesterAnswerClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'recordAnswer' in value &&
    typeof value.recordAnswer === 'function'
  );
}
