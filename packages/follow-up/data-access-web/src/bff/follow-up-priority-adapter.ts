import type { FollowUpPriorityAssignment } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type {
  FollowUpPriorityCommand,
  FollowUpPriorityFailure,
} from '../client/follow-up-priority';
import {
  INVALID_RESPONSE,
  TRANSPORT_FAILURE,
  mapCsrfHttpFailure,
} from './follow-up-failures';
import { readJson, readOptionalProblem } from './json-response';
import { utcInstant, type BrowserCsrfToken } from './follow-up-wire-schemas';
import {
  followUpPriority,
  priorityRevision,
} from './follow-up-priority-schemas';

const ownershipRevision = Schema.Int.pipe(
  Schema.between(1, Number.MAX_SAFE_INTEGER),
  Schema.filter((value) => value % 2 === 1),
);
const intentSchema = Schema.Struct({
  tenantId: Schema.UUID,
  workItemId: Schema.UUID,
  commandId: Schema.UUID,
  claimId: Schema.UUID,
  expectedOwnershipRevision: ownershipRevision,
  expectedPriorityRevision: priorityRevision.pipe(
    Schema.lessThan(Number.MAX_SAFE_INTEGER),
  ),
  priority: followUpPriority,
});
const receiptSchema = Schema.Struct({
  commandId: Schema.UUID,
  workItemId: Schema.UUID,
  claimId: Schema.UUID,
  expectedOwnershipRevision: ownershipRevision,
  expectedPriorityRevision: priorityRevision,
  priorityRevision,
  priority: followUpPriority,
  assignedAt: utcInstant,
  recordedAt: utcInstant,
});
const problems = new Map<string, FollowUpPriorityFailure>([
  [
    '404:urn:ergon:problem:human-follow-up-priority-not-found',
    { kind: 'not-found' },
  ],
  [
    '409:urn:ergon:problem:human-follow-up-priority-conflict',
    { kind: 'priority-conflict' },
  ],
  [
    '400:urn:ergon:problem:invalid-human-follow-up-priority',
    { kind: 'invalid-priority' },
  ],
  [
    '503:urn:ergon:problem:human-follow-up-priority-unavailable',
    { kind: 'priority-unavailable' },
  ],
]);

/** Validate both fences before sending; the session adapter owns CSRF, interruption and request deadlines. */
export function requestFollowUpPriority(
  fetch: typeof globalThis.fetch,
  command: FollowUpPriorityCommand,
  token: BrowserCsrfToken,
): Effect.Effect<FollowUpPriorityAssignment, FollowUpPriorityFailure, never> {
  return Schema.decodeUnknown(intentSchema)(command).pipe(
    Effect.mapError((): FollowUpPriorityFailure => ({
      kind: 'invalid-priority',
    })),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: (signal) =>
          fetch(
            `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/priority-assignments`,
            {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
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
                expectedPriorityRevision: command.expectedPriorityRevision,
                priority: command.priority,
              }),
            },
          ),
        catch: (): FollowUpPriorityFailure => TRANSPORT_FAILURE,
      }),
    ),
    Effect.flatMap((response) => decodeReceipt(response, command)),
  );
}

/** Both initial and replay acknowledgements must match the entire original intent and its exact successor. */
function decodeReceipt(
  response: Response,
  command: FollowUpPriorityCommand,
): Effect.Effect<FollowUpPriorityAssignment, FollowUpPriorityFailure, never> {
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
    Effect.flatMap(Schema.decodeUnknown(receiptSchema)),
    Effect.filterOrFail(
      (receipt) =>
        receipt.commandId === command.commandId &&
        receipt.workItemId === command.workItemId &&
        receipt.claimId === command.claimId &&
        receipt.expectedOwnershipRevision ===
          command.expectedOwnershipRevision &&
        receipt.expectedPriorityRevision === command.expectedPriorityRevision &&
        receipt.priorityRevision === command.expectedPriorityRevision + 1 &&
        receipt.priority === command.priority,
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}
