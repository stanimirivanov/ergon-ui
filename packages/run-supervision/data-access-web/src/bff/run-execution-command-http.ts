import { Effect, Either, Schema } from 'effect';
import type { RunExecutionFailure } from '../execution-command-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { mapReadHttpFailure, readJson } from './run-supervision-http';

const kinds = Schema.Literal(
  'execution-disabled',
  'execution-conflict',
  'invalid-execution',
  'execution-unavailable',
  'execution-unsupported',
  'csrf-rejected',
);
const failures: ReadonlyMap<string, typeof kinds.Type> = new Map([
  ['503:urn:ergon:problem:run-execution-disabled', 'execution-disabled'],
  ['503:urn:ergon:problem:run-execution-unavailable', 'execution-unavailable'],
  ['409:urn:ergon:problem:run-execution-conflict', 'execution-conflict'],
  ['400:urn:ergon:problem:invalid-run-execution', 'invalid-execution'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Stable status/type mapping only. An unrecognized 404 means unsupported route, never private-run absence or permission. */
export function readExecutionFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunExecutionFailure, RunExecutionFailure, never> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunExecutionFailure => {
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
        return { kind: 'execution-unsupported' };
      return mapReadHttpFailure(response.status, body);
    }),
  );
}

/** Cause-free failure normalization before cache serialization/logging, including rejected client defects. */
export function normalizeRunExecutionFailure(
  value: unknown,
): RunExecutionFailure {
  const decoded = Schema.decodeUnknownEither(Schema.Struct({ kind: kinds }))(
    value,
  );
  return Either.isRight(decoded)
    ? decoded.right
    : normalizeRunSupervisionFailure(value);
}
