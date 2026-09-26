import { Effect, Either, Schema } from 'effect';

import { INVALID_RESPONSE } from './follow-up-failures';
import { problemDetailSchema } from './follow-up-wire-schemas';

export function readJson(response: Response) {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: () => INVALID_RESPONSE,
  });
}

export function readOptionalProblem(response: Response) {
  return readJson(response).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.map((body) => {
      const decoded = Schema.decodeUnknownEither(problemDetailSchema)(body);
      return Either.isRight(decoded) ? decoded.right : undefined;
    }),
  );
}
