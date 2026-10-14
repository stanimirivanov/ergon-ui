import { Effect, Either, Schema } from 'effect';
import type { RunApprovalFailure } from '../approval-contracts';
import { mapReadHttpFailure, readJson } from './run-supervision-http';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';

type ApprovalProblemKind =
  | 'approval-disabled'
  | 'approval-conflict'
  | 'approval-authority-missing'
  | 'invalid-approval'
  | 'csrf-rejected';
const failures: ReadonlyMap<string, ApprovalProblemKind> = new Map([
  ['503:urn:ergon:problem:run-approval-disabled', 'approval-disabled'],
  ['409:urn:ergon:problem:run-approval-conflict', 'approval-conflict'],
  [
    '403:urn:ergon:problem:run-approval-authority-missing',
    'approval-authority-missing',
  ],
  ['400:urn:ergon:problem:invalid-run-approval', 'invalid-approval'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);
const problem = Schema.Struct({ type: Schema.String });
/** Stable status/type pairing only; never disclose raw problem detail or attribution. */
export function readApprovalFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunApprovalFailure, RunApprovalFailure, never> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunApprovalFailure => {
      const decoded = Schema.decodeUnknownEither(problem)(body);
      const kind = Either.isRight(decoded)
        ? failures.get(`${response.status}:${decoded.right.type}`)
        : undefined;
      return kind === undefined
        ? mapReadHttpFailure(response.status, body)
        : { kind };
    }),
  );
}
/** Normalize once before cache logging/serialization; retain neither raw causes nor arbitrary extra properties. */
export function normalizeRunApprovalFailure(
  value: unknown,
): RunApprovalFailure {
  const decoded = Schema.decodeUnknownEither(
    Schema.Struct({
      kind: Schema.Literal(
        'approval-disabled',
        'approval-conflict',
        'approval-authority-missing',
        'invalid-approval',
        'csrf-rejected',
      ),
    }),
  )(value);
  return Either.isRight(decoded)
    ? decoded.right
    : normalizeRunSupervisionFailure(value);
}
