import type { FollowUpCompletion } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type {
  FollowUpCompletionCommand,
  FollowUpCompletionFailure,
} from '../client/follow-up-completion';
import {
  INVALID_RESPONSE,
  TRANSPORT_FAILURE,
  mapCsrfHttpFailure,
} from './follow-up-failures';
import { readJson, readOptionalProblem } from './json-response';
import { utcInstant, type BrowserCsrfToken } from './follow-up-wire-schemas';

const revision = Schema.Int.pipe(Schema.between(1, Number.MAX_SAFE_INTEGER));
const intentSchema = Schema.Struct({
  tenantId: Schema.UUID,
  workItemId: Schema.UUID,
  commandId: Schema.UUID,
  claimId: Schema.UUID,
  expectedOwnershipRevision: revision.pipe(
    Schema.filter((value) => value % 2 === 1),
  ),
});
const receiptSchema = Schema.Struct({
  commandId: Schema.UUID,
  workItemId: Schema.UUID,
  claimId: Schema.UUID,
  expectedOwnershipRevision: revision,
  completedAt: utcInstant,
  recordedAt: utcInstant,
});
const problems = new Map<string, FollowUpCompletionFailure>([
  [
    '404:urn:ergon:problem:human-follow-up-completion-not-found',
    { kind: 'not-found' },
  ],
  [
    '409:urn:ergon:problem:human-follow-up-completion-conflict',
    { kind: 'completion-conflict' },
  ],
  [
    '400:urn:ergon:problem:invalid-human-follow-up-completion',
    { kind: 'invalid-completion' },
  ],
  [
    '503:urn:ergon:problem:human-follow-up-completion-unavailable',
    { kind: 'completion-unavailable' },
  ],
]);

/** Validates intent before POST. The surrounding ownership adapter owns CSRF and the deadline. */
export function requestFollowUpCompletion(
  fetch: typeof globalThis.fetch,
  command: FollowUpCompletionCommand,
  token: BrowserCsrfToken,
): Effect.Effect<FollowUpCompletion, FollowUpCompletionFailure, never> {
  return Schema.decodeUnknown(intentSchema)(command).pipe(
    Effect.mapError((): FollowUpCompletionFailure => ({
      kind: 'invalid-completion',
    })),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: (signal) =>
          fetch(
            `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/completions`,
            {
              method: 'POST',
              credentials: 'same-origin',
              signal,
              headers: {
                Accept: 'application/json, application/problem+json',
                'Content-Type': 'application/json',
                [token.headerName]: token.token,
              },
              body: JSON.stringify({
                commandId: command.commandId,
                claimId: command.claimId,
                expectedOwnershipRevision: command.expectedOwnershipRevision,
              }),
            },
          ),
        catch: (): FollowUpCompletionFailure => TRANSPORT_FAILURE,
      }),
    ),
    Effect.flatMap((response) => decodeReceipt(response, command)),
  );
}

/** Initial and replay receipts must describe the exact original intent, not a newer claim. */
function decodeReceipt(
  response: Response,
  command: FollowUpCompletionCommand,
): Effect.Effect<FollowUpCompletion, FollowUpCompletionFailure, never> {
  if (response.status !== 200 && response.status !== 201) {
    return readOptionalProblem(response).pipe(
      Effect.flatMap((problem) =>
        Effect.fail(
          problems.get(`${response.status}:${problem?.type}`) ??
            mapCsrfHttpFailure(response.status, problem),
        ),
      ),
    );
  }
  return readJson(response).pipe(
    Effect.flatMap(Schema.decodeUnknown(receiptSchema)),
    Effect.filterOrFail(
      (receipt) =>
        receipt.commandId === command.commandId &&
        receipt.workItemId === command.workItemId &&
        receipt.claimId === command.claimId &&
        receipt.expectedOwnershipRevision === command.expectedOwnershipRevision,
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}
