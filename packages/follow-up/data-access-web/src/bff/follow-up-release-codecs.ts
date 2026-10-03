import type {
  HumanFollowUpReleaseCommand,
  HumanFollowUpReleaseFailure,
} from '../client';
import type { HumanFollowUpRelease } from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';

import { INVALID_RESPONSE, mapReleaseHttpFailure } from './follow-up-failures';
import { humanFollowUpReleaseSchema } from './follow-up-wire-schemas';
import { readJson, readOptionalProblem } from './json-response';

/**
 * Accepts a new or exact-replay release only when its receipt matches the
 * submitted claim and next ownership revision. A mismatched success fails
 * closed before entering remote cache state.
 */
export function decodeHumanFollowUpRelease(
  response: Response,
  command: HumanFollowUpReleaseCommand,
): Effect.Effect<HumanFollowUpRelease, HumanFollowUpReleaseFailure, never> {
  if (response.status === 200 || response.status === 201) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(humanFollowUpReleaseSchema)),
      Effect.flatMap((release) =>
        release.claimId === command.claimId &&
        release.workItemId === command.workItemId &&
        release.ownershipRevision === command.expectedOwnershipRevision + 1 &&
        release.ownershipRevision % 2 === 0
          ? Effect.succeed(release)
          : Effect.fail(INVALID_RESPONSE),
      ),
      Effect.map((release): HumanFollowUpRelease => release),
      Effect.mapError((): HumanFollowUpReleaseFailure => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapReleaseHttpFailure(response.status, problem)),
    ),
  );
}
