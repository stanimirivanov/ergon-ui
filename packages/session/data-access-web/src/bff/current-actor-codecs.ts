import type { CurrentActor } from '@ergon/session-model';
import { Effect, Either, Schema } from 'effect';

import type { CurrentActorFailure } from '../current-actor-client';
import {
  INVALID_RESPONSE,
  mapCurrentActorHttpFailure,
} from './current-actor-failures';
import {
  currentActorResponseSchema,
  problemDetailSchema,
  type ProblemDetail,
} from './current-actor-wire-schemas';

/** Decodes one session response without allowing raw wire data into the domain. */
export function decodeCurrentActorResponse(
  response: Response,
): Effect.Effect<CurrentActor, CurrentActorFailure, never> {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(currentActorResponseSchema)),
      Effect.map((actor): CurrentActor => ({
        actorId: actor.actorId,
        identityProvider: actor.identityProvider,
        registeredAt: actor.registeredAt,
        recordedAt: actor.recordedAt,
      })),
      Effect.mapError(() => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapCurrentActorHttpFailure(response.status, problem)),
    ),
  );
}

function readJson(
  response: Response,
): Effect.Effect<unknown, typeof INVALID_RESPONSE, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: () => INVALID_RESPONSE,
  });
}

/**
 * Treats an unreadable or malformed problem body as absent so status fallback
 * policy can classify the response without trusting descriptive fields.
 */
function readOptionalProblem(
  response: Response,
): Effect.Effect<ProblemDetail | undefined, never, never> {
  return readJson(response).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.map((body) => {
      const decoded = Schema.decodeUnknownEither(problemDetailSchema)(body);
      return Either.isRight(decoded) ? decoded.right : undefined;
    }),
  );
}
