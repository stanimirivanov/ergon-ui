import type { FollowUpQuestion } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type {
  FollowUpQuestionFailure,
  RecordFollowUpQuestionCommand,
} from '../client/follow-up-questions';
import type { BrowserCsrfToken } from './follow-up-wire-schemas';
import {
  INVALID_RESPONSE,
  TRANSPORT_FAILURE,
  mapCsrfHttpFailure,
} from './follow-up-failures';
import { readJson, readOptionalProblem } from './json-response';
import { followUpQuestionSchema } from './follow-up-question-schema';
import { questionsUrl } from './follow-up-urls';

const problems = new Map<string, FollowUpQuestionFailure>([
  [
    '404:urn:ergon:problem:requester-information-request-not-found',
    { kind: 'not-found' },
  ],
  [
    '409:urn:ergon:problem:requester-information-request-conflict',
    { kind: 'question-conflict' },
  ],
  [
    '400:urn:ergon:problem:invalid-requester-information-request',
    { kind: 'invalid-question' },
  ],
]);

/** One exact POST; the session adapter supplies shared CSRF, interruption and per-attempt timeout, never POST retry. */
export function requestFollowUpQuestion(
  fetch: typeof globalThis.fetch,
  command: RecordFollowUpQuestionCommand,
  token: BrowserCsrfToken,
): Effect.Effect<FollowUpQuestion, FollowUpQuestionFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(questionsUrl(command), {
        method: 'POST',
        credentials: 'same-origin',
        signal,
        headers: {
          Accept: 'application/json, application/problem+json',
          'Content-Type': 'application/json',
          [token.headerName]: token.token,
        },
        body: JSON.stringify({
          requestId: command.requestId,
          claimId: command.claimId,
          expectedOwnershipRevision: command.expectedOwnershipRevision,
          question: command.question,
        }),
      }),
    catch: (): FollowUpQuestionFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap((response) => decodeReceipt(response, command)));
}

/** A plausible receipt for another intent is still an uncertain result, not acknowledgement. */
function decodeReceipt(
  response: Response,
  command: RecordFollowUpQuestionCommand,
): Effect.Effect<FollowUpQuestion, FollowUpQuestionFailure, never> {
  if (response.status !== 200 && response.status !== 201)
    return readOptionalProblem(response).pipe(
      Effect.flatMap((problem) =>
        Effect.fail(
          problems.get(`${response.status}:${problem?.type}`) ??
            mapCsrfHttpFailure(response.status, problem),
        ),
      ),
    );
  return readJson(response).pipe(
    Effect.flatMap(Schema.decodeUnknown(followUpQuestionSchema)),
    Effect.filterOrFail(
      (receipt) =>
        receipt.requestId === command.requestId &&
        receipt.caseId === command.caseId &&
        receipt.claimId === command.claimId &&
        receipt.ownershipRevision === command.expectedOwnershipRevision &&
        receipt.question === command.question,
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}
