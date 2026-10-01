import type { HumanFollowUpClaimFailure } from '../client';
import type { HumanFollowUpClaim } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';

import { INVALID_RESPONSE, mapClaimHttpFailure } from './follow-up-failures';
import {
  csrfTokenSchema,
  humanFollowUpClaimSchema,
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
): Effect.Effect<BrowserCsrfToken, HumanFollowUpClaimFailure, never> {
  if (response.status === 200) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(csrfTokenSchema)),
      Effect.map((token): BrowserCsrfToken => token),
      Effect.mapError((): HumanFollowUpClaimFailure => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapClaimHttpFailure(response.status, problem)),
    ),
  );
}

/**
 * Decodes a created or replayed same-resolver claim.
 * Both 200 and 201 are successful because the server's idempotent contract may
 * return existing ownership rather than create a duplicate claim.
 */
export function decodeHumanFollowUpClaim(
  response: Response,
): Effect.Effect<HumanFollowUpClaim, HumanFollowUpClaimFailure, never> {
  if (response.status === 200 || response.status === 201) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(humanFollowUpClaimSchema)),
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
