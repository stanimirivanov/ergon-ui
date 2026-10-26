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

const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => Number.isFinite(Date.parse(value))),
);
const question = Schema.Struct({
  requestId: Schema.UUID,
  caseId: Schema.UUID,
  claimId: Schema.UUID,
  ownershipRevision: Schema.Int.pipe(
    Schema.between(1, Number.MAX_SAFE_INTEGER),
  ),
  authorActorId: Schema.UUID,
  question: Schema.String.pipe(Schema.filter(isQuestionText)),
  requestedAt: instant,
  recordedAt: instant,
});
const page = Schema.Struct({
  items: Schema.Array(question).pipe(Schema.maxItems(100)),
  truncated: Schema.Boolean,
});

// Kotlin blankness includes Unicode separators and U+001C..001F, but not BOM.
function isQuestionText(text: string): boolean {
  const characters = Array.from(text);
  return (
    characters.length <= 4000 &&
    characters.some((character) => {
      const code = character.charCodeAt(0);
      return (
        !/[\p{Z}\t\n\v\f\r]/u.test(character) && !(code >= 0x1c && code <= 0x1f)
      );
    }) &&
    !text.includes('\u0000') &&
    !/[\ud800-\udfff]/u.test(text)
  );
}

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
          fetch(
            `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/information-requests`,
            {
              credentials: 'same-origin',
              headers: { Accept: 'application/json, application/problem+json' },
              signal,
            },
          ),
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
