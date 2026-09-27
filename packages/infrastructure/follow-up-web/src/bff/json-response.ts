import { Effect, Either, Schema } from 'effect';

import { INVALID_RESPONSE } from './follow-up-failures';
import {
  problemDetailSchema,
  type ProblemDetail,
} from './follow-up-wire-schemas';

/**
 * Reads one response body as untrusted JSON.
 *
 * Body consumption or JSON parsing failure is normalized before schema
 * decoding so browser exceptions never escape into application state.
 */
export function readJson(
  response: Response,
): Effect.Effect<unknown, typeof INVALID_RESPONSE, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: () => INVALID_RESPONSE,
  });
}

/**
 * Decodes the minimal RFC 9457 fields used for failure classification.
 *
 * Missing, unreadable, or non-conforming bodies produce `undefined` so the
 * caller can fall back to status-based mapping without trusting problem data.
 */
export function readOptionalProblem(
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
