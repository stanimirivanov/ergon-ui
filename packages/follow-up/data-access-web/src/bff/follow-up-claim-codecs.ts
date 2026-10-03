import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpCommandFailure,
} from '../client';
import type { HumanFollowUpClaim } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';

import {
  INVALID_RESPONSE,
  mapClaimHttpFailure,
  mapCsrfHttpFailure,
} from './follow-up-failures';
import {
  csrfTokenSchema,
  humanFollowUpClaimCommandSchema,
  type BrowserCsrfToken,
} from './follow-up-wire-schemas';
import { readJson, readOptionalProblem } from './json-response';

/**
 * Decodes the exact CSRF success contract or a typed claim-setup failure.
 * The schema fixes the allowed request-header name and requires a non-empty
 * opaque token.
 */
export function decodeCsrfToken(
  response: Response,
): Effect.Effect<BrowserCsrfToken, HumanFollowUpCommandFailure, never> {
  if (response.status === 200) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(csrfTokenSchema)),
      Effect.map((token): BrowserCsrfToken => token),
      Effect.mapError((): HumanFollowUpCommandFailure => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapCsrfHttpFailure(response.status, problem)),
    ),
  );
}

/**
 * Decodes a new or exactly replayed command receipt and verifies that it
 * belongs to the submitted intent before any claim enters remote cache state.
 */
export function decodeHumanFollowUpClaim(
  response: Response,
  command: HumanFollowUpClaimCommand,
): Effect.Effect<HumanFollowUpClaim, HumanFollowUpClaimFailure, never> {
  if (response.status === 200 || response.status === 201) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(humanFollowUpClaimCommandSchema)),
      Effect.flatMap((receipt) =>
        receipt.commandId === command.commandId &&
        receipt.ownershipRevision === command.expectedOwnershipRevision + 1 &&
        receipt.claim.workItemId === command.workItemId
          ? Effect.succeed(receipt.claim)
          : Effect.fail(INVALID_RESPONSE),
      ),
      Effect.map((claim): HumanFollowUpClaim => claim),
      Effect.mapError((): HumanFollowUpClaimFailure => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapClaimHttpFailure(response.status, problem)),
    ),
  );
}
