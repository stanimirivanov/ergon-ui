import type { HumanFollowUpClaimFailure } from '@ergon/application-follow-up';
import type { HumanFollowUpClaim } from '@ergon/domain-follow-up';
import { Effect, Schema } from 'effect';

import { INVALID_RESPONSE, mapClaimHttpFailure } from './follow-up-failures';
import {
  csrfTokenSchema,
  humanFollowUpClaimSchema,
  type BrowserCsrfToken,
} from './follow-up-wire-schemas';
import { readJson, readOptionalProblem } from './json-response';

export function decodeCsrfToken(response: Response) {
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

export function decodeHumanFollowUpClaim(response: Response) {
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
