import { Effect, Either, Schema } from 'effect';
import type { RunSupervisorHandoverFailure } from '../handover-contracts';
import { mapReadHttpFailure, readJson } from './run-supervision-http';

const problem = Schema.Struct({ type: Schema.String });
type HandoverProblemKind =
  | 'handover-disabled'
  | 'handover-conflict'
  | 'handover-unavailable'
  | 'recipient-not-eligible'
  | 'invalid-handover'
  | 'csrf-rejected';
const failures: ReadonlyMap<string, HandoverProblemKind> = new Map([
  [
    '503:urn:ergon:problem:run-supervisor-handover-disabled',
    'handover-disabled',
  ],
  [
    '409:urn:ergon:problem:run-supervisor-handover-conflict',
    'handover-conflict',
  ],
  [
    '409:urn:ergon:problem:run-supervisor-handover-unavailable',
    'handover-unavailable',
  ],
  [
    '409:urn:ergon:problem:run-supervisor-not-eligible',
    'recipient-not-eligible',
  ],
  ['400:urn:ergon:problem:invalid-run-supervisor-handover', 'invalid-handover'],
  ['403:urn:ergon:problem:invalid-browser-csrf-token', 'csrf-rejected'],
]);

/** Preserve known handover meaning while sharing generic browser-auth/status classification; never expose detail. */
export function readHandoverFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<
  RunSupervisorHandoverFailure,
  RunSupervisorHandoverFailure,
  never
> {
  return readJson(response, signal).pipe(
    Effect.catchAll((error) =>
      error.kind === 'request-cancelled'
        ? Effect.fail(error)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunSupervisorHandoverFailure => {
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
