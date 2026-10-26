import type { FollowUpQuestions } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type { HumanFollowUpBffAdapterOptions } from '../create-human-follow-up-bff-adapter';
import type {
  FollowUpQuestionsQuery,
  ListFollowUpQuestions,
} from '../client/follow-up-questions';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import {
  INVALID_RESPONSE,
  mapReadHttpFailure,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import { readJson, readOptionalProblem } from './json-response';
import { runRead } from './follow-up-read-adapter';
import { followUpQuestionSchema } from './follow-up-question-schema';
import { questionsUrl } from './follow-up-urls';

const page = Schema.Struct({
  items: Schema.Array(followUpQuestionSchema).pipe(Schema.maxItems(100)),
  truncated: Schema.Boolean,
});

/** Same-origin current-owner GET; bounded transient retry and interruption share the established read runner.
 * Unexpected defects may reject and must be contained by the cache boundary. No CSRF or POST is acquired.
 * @throws RangeError for a nonpositive/nonfinite timeout.
 */
export function createFollowUpQuestionsReader({
  fetch,
  requestTimeout = 5000,
}: HumanFollowUpBffAdapterOptions): ListFollowUpQuestions {
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0)
    throw new RangeError('requestTimeout must be positive');
  return (query, signal) =>
    runRead(
      Effect.tryPromise({
        try: (signal) =>
          fetch(questionsUrl(query), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json, application/problem+json' },
            signal,
          }),
        catch: (): ResolverFollowUpCaseSummaryFailure => TRANSPORT_FAILURE,
      }).pipe(Effect.flatMap((response) => decodeQuestions(response, query))),
      signal,
      requestTimeout,
      (questions) => ({ ok: true as const, questions }),
    );
}

/** Rejects mismatched cases, duplicate IDs, unsafe revisions and noncanonical history order before caching. */
function decodeQuestions(
  response: Response,
  query: FollowUpQuestionsQuery,
): Effect.Effect<FollowUpQuestions, ResolverFollowUpCaseSummaryFailure, never> {
  if (response.status !== 200)
    return readOptionalProblem(response).pipe(
      Effect.flatMap((problem) =>
        Effect.fail(
          response.status === 404 &&
            problem?.type ===
              'urn:ergon:problem:requester-information-request-not-found'
            ? { kind: 'not-found' as const }
            : mapReadHttpFailure(response.status, problem),
        ),
      ),
    );
  return readJson(response).pipe(
    Effect.flatMap(Schema.decodeUnknown(page)),
    Effect.filterOrFail(
      (history) =>
        (!history.truncated || history.items.length === 100) &&
        new Set(history.items.map((item) => item.requestId.toLowerCase()))
          .size === history.items.length &&
        history.items.every((item, index) => {
          const previous = history.items[index - 1];
          const key = (value: typeof item): string => {
            const [seconds = '', fraction = ''] = value.recordedAt
              .slice(0, -1)
              .split('.');
            return `${seconds}.${fraction.padEnd(9, '0')}:${value.requestId.toLowerCase()}`;
          };
          return (
            item.caseId === query.caseId &&
            item.ownershipRevision <= query.expectedOwnershipRevision &&
            (previous === undefined || key(previous) > key(item))
          );
        }),
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}
