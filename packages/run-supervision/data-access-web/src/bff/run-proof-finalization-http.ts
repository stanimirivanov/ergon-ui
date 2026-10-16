import { Effect, Either, Schema } from 'effect';
import type { RunProofFinalizationFailure } from '../proof-finalization-contracts';
import { mapReadHttpFailure, readJson } from './run-supervision-http';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';

const kinds = Schema.Literal(
  'proof-finalization-disabled',
  'proof-finalization-conflict',
  'invalid-proof-finalization',
  'csrf-rejected',
);
type ProofProblemKind = typeof kinds.Type;
const failures: ReadonlyMap<string, ProofProblemKind> = new Map([
  [
    '503:urn:ergon:problem:run-proof-finalization-disabled',
    'proof-finalization-disabled',
  ],
  [
    '409:urn:ergon:problem:run-proof-finalization-conflict',
    'proof-finalization-conflict',
  ],
  [
    '400:urn:ergon:problem:invalid-run-proof-finalization',
    'invalid-proof-finalization',
  ],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Only stable status/type pairs cross this boundary, never raw problem text or attribution. */
export function readProofFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<
  RunProofFinalizationFailure,
  RunProofFinalizationFailure,
  never
> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunProofFinalizationFailure => {
      const decoded = Schema.decodeUnknownEither(
        Schema.Struct({ type: Schema.String }),
      )(body);
      const kind = Either.isRight(decoded)
        ? failures.get(`${response.status}:${decoded.right.type}`)
        : undefined;
      return kind === undefined
        ? mapReadHttpFailure(response.status, body)
        : { kind };
    }),
  );
}

/** Normalize once before RTK serialization/logging; discard raw causes and arbitrary fields. */
export function normalizeRunProofFinalizationFailure(
  value: unknown,
): RunProofFinalizationFailure {
  const decoded = Schema.decodeUnknownEither(Schema.Struct({ kind: kinds }))(
    value,
  );
  return Either.isRight(decoded)
    ? decoded.right
    : normalizeRunSupervisionFailure(value);
}
