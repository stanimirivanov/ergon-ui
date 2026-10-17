import { Effect, Either, Schema } from 'effect';
import type { RunRetryFailure } from '../retry-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { mapReadHttpFailure, readJson } from './run-supervision-http';

const kinds = Schema.Literal(
  'retry-disabled',
  'retry-conflict',
  'invalid-retry',
  'retry-unavailable',
  'retry-unsupported',
  'csrf-rejected',
);
const failures: ReadonlyMap<string, typeof kinds.Type> = new Map([
  ['503:urn:ergon:problem:run-retry-disabled', 'retry-disabled'],
  ['503:urn:ergon:problem:run-retry-unavailable', 'retry-unavailable'],
  ['409:urn:ergon:problem:run-retry-conflict', 'retry-conflict'],
  ['400:urn:ergon:problem:invalid-run-retry', 'invalid-retry'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Stable status/type pairs only; an unknown 404 is unsupported, not private-run absence. Raw problem details never leave data access. */
export function readRetryFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunRetryFailure, RunRetryFailure, never> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunRetryFailure => {
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
        return { kind: 'retry-unsupported' };
      return mapReadHttpFailure(response.status, body);
    }),
  );
}

/** Copy only recognized cause-free outcomes before cache/framework serialization; unknown values remain defects. */
export function normalizeRunRetryFailure(value: unknown): RunRetryFailure {
  const decoded = Schema.decodeUnknownEither(Schema.Struct({ kind: kinds }))(
    value,
  );
  return Either.isRight(decoded)
    ? decoded.right
    : normalizeRunSupervisionFailure(value);
}
