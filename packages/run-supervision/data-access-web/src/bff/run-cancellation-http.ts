import { Effect, Either, Schema } from 'effect';
import type { RunCancellationFailure } from '../cancellation-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { mapReadHttpFailure, readJson } from './run-supervision-http';

const kinds = Schema.Literal(
  'cancellation-disabled',
  'cancellation-conflict',
  'invalid-cancellation',
  'cancellation-unavailable',
  'cancellation-unsupported',
  'csrf-rejected',
);
const failures: ReadonlyMap<string, typeof kinds.Type> = new Map([
  ['503:urn:ergon:problem:run-cancellation-disabled', 'cancellation-disabled'],
  [
    '503:urn:ergon:problem:run-cancellation-unavailable',
    'cancellation-unavailable',
  ],
  ['409:urn:ergon:problem:run-cancellation-conflict', 'cancellation-conflict'],
  ['400:urn:ergon:problem:invalid-run-cancellation', 'invalid-cancellation'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Unknown 404 means an unsupported route; protected absence remains neutral. Raw problem details never enter cache or UI. */
export function readCancellationFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunCancellationFailure, RunCancellationFailure, never> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunCancellationFailure => {
      const decoded = Schema.decodeUnknownEither(
        Schema.Struct({ type: Schema.String }),
      )(body);
      const type = Either.isRight(decoded) ? decoded.right.type : undefined;
      const kind = failures.get(`${response.status}:${type}`);
      if (kind !== undefined) return { kind };
      if (
        response.status === 404 &&
        type !== 'urn:ergon:problem:assigned-resolution-run-not-found'
      )
        return { kind: 'cancellation-unsupported' };
      return mapReadHttpFailure(response.status, body);
    }),
  );
}

/** Only recognized cause-free outcomes cross the serialization boundary; defects stay distinct. */
export function normalizeRunCancellationFailure(
  value: unknown,
): RunCancellationFailure {
  const decoded = Schema.decodeUnknownEither(Schema.Struct({ kind: kinds }))(
    value,
  );
  return Either.isRight(decoded)
    ? decoded.right
    : normalizeRunSupervisionFailure(value);
}
