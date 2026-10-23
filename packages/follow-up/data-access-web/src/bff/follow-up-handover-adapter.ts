import type { FollowUpHandover } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type {
  FollowUpHandoverCommand,
  FollowUpHandoverFailure,
} from '../client/follow-up-handover';
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
  recipientActorId: Schema.UUID,
  expectedOwnershipRevision: revision.pipe(
    Schema.filter(
      (value) => value % 2 === 1 && value <= Number.MAX_SAFE_INTEGER - 2,
    ),
  ),
});
const receiptSchema = Schema.Struct({
  commandId: Schema.UUID,
  workItemId: Schema.UUID,
  originalClaimId: Schema.UUID,
  expectedOwnershipRevision: revision,
  recipientActorId: Schema.UUID,
  successorClaimId: Schema.UUID,
  ownershipRevision: revision,
  handedOverAt: utcInstant,
  recordedAt: utcInstant,
});
const problems = new Map<string, FollowUpHandoverFailure>([
  [
    '404:urn:ergon:problem:human-follow-up-handover-not-found',
    { kind: 'not-found' },
  ],
  [
    '409:urn:ergon:problem:human-follow-up-handover-conflict',
    { kind: 'handover-conflict' },
  ],
  [
    '409:urn:ergon:problem:human-follow-up-handover-recipient-unavailable',
    { kind: 'recipient-unavailable' },
  ],
  [
    '400:urn:ergon:problem:invalid-human-follow-up-handover',
    { kind: 'invalid-handover' },
  ],
  [
    '503:urn:ergon:problem:human-follow-up-handover-unavailable',
    { kind: 'handover-unavailable' },
  ],
]);

/** Validates intent before POST. The surrounding ownership adapter owns CSRF and the deadline. */
export function requestFollowUpHandover(
  fetch: typeof globalThis.fetch,
  command: FollowUpHandoverCommand,
  token: BrowserCsrfToken,
): Effect.Effect<FollowUpHandover, FollowUpHandoverFailure, never> {
  return Schema.decodeUnknown(intentSchema)(command).pipe(
    Effect.mapError((): FollowUpHandoverFailure => ({
      kind: 'invalid-handover',
    })),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: (signal) =>
          fetch(
            `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/handovers`,
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
                recipientActorId: command.recipientActorId,
              }),
            },
          ),
        catch: (): FollowUpHandoverFailure => TRANSPORT_FAILURE,
      }),
    ),
    Effect.flatMap((response) => decodeReceipt(response, command)),
  );
}

/** Initial and replay receipts must describe the exact original intent, not a newer claim. */
function decodeReceipt(
  response: Response,
  command: FollowUpHandoverCommand,
): Effect.Effect<FollowUpHandover, FollowUpHandoverFailure, never> {
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
        receipt.originalClaimId === command.claimId &&
        receipt.expectedOwnershipRevision ===
          command.expectedOwnershipRevision &&
        receipt.recipientActorId === command.recipientActorId &&
        receipt.successorClaimId !== command.claimId &&
        receipt.ownershipRevision === command.expectedOwnershipRevision + 2,
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}
