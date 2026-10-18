import { Effect, Either, Schema } from 'effect';
import type { RunEscalationFailure } from '../escalation-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { mapReadHttpFailure, readJson } from './run-supervision-http';

const kinds = Schema.Literal(
  'escalation-disabled',
  'escalation-conflict',
  'invalid-escalation',
  'escalation-unavailable',
  'escalation-unsupported',
  'csrf-rejected',
);
const failures: ReadonlyMap<string, typeof kinds.Type> = new Map([
  ['503:urn:ergon:problem:run-escalation-disabled', 'escalation-disabled'],
  [
    '503:urn:ergon:problem:run-escalation-unavailable',
    'escalation-unavailable',
  ],
  ['409:urn:ergon:problem:run-escalation-conflict', 'escalation-conflict'],
  ['400:urn:ergon:problem:invalid-run-escalation', 'invalid-escalation'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Stable status/type pairs only. Unknown 404 means unsupported, not protected absence; raw problem content never reaches UI/cache. */
export function readEscalationFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunEscalationFailure, RunEscalationFailure, never> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunEscalationFailure => {
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
        return { kind: 'escalation-unsupported' };
      return mapReadHttpFailure(response.status, body);
    }),
  );
}

/** Copy recognized cause-free outcomes before framework serialization; unknown failures remain defects, not transport errors. */
export function normalizeRunEscalationFailure(
  value: unknown,
): RunEscalationFailure {
  const result = Schema.decodeUnknownEither(Schema.Struct({ kind: kinds }))(
    value,
  );
  return Either.isRight(result)
    ? result.right
    : normalizeRunSupervisionFailure(value);
}
