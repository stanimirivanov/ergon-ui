import { Effect, Either, Schema } from 'effect';

import type { RunSupervisionFailure } from '../contracts';

const problemSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});

type ProblemFailureKind = Exclude<
  RunSupervisionFailure['kind'],
  'service-unavailable' | 'unexpected-http-status'
>;

const problemFailures: ReadonlyMap<string, ProblemFailureKind> = new Map([
  ['403:urn:ergon:problem:human-actor-not-registered', 'actor-not-registered'],
  [
    '403:urn:ergon:problem:untrusted-human-identity-issuer',
    'identity-rejected',
  ],
  [
    '403:urn:ergon:problem:invalid-authenticated-human-identity',
    'identity-rejected',
  ],
  [
    '400:urn:ergon:problem:invalid-assigned-resolution-run-page',
    'invalid-page',
  ],
  ['404:urn:ergon:problem:assigned-resolution-run-not-found', 'not-found'],
  [
    '503:urn:ergon:problem:browser-authentication-unavailable',
    'authentication-unavailable',
  ],
]);

export function readJson(
  response: Response,
  callerSignal: AbortSignal,
): Effect.Effect<unknown, RunSupervisionFailure, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: (cause): RunSupervisionFailure =>
      callerSignal.aborted && isAbortError(cause)
        ? { kind: 'request-cancelled' }
        : { kind: 'invalid-response' },
  });
}

/** Only known problem identities contribute meaning; private response detail never escapes. */
export function readHttpFailure(
  response: Response,
  callerSignal: AbortSignal,
): Effect.Effect<RunSupervisionFailure, RunSupervisionFailure, never> {
  return readJson(response, callerSignal).pipe(
    Effect.catchAll((failure) =>
      failure.kind === 'request-cancelled'
        ? Effect.fail(failure)
        : Effect.succeed(undefined),
    ),
    Effect.map((body): RunSupervisionFailure => {
      const decoded = Schema.decodeUnknownEither(problemSchema)(body);
      const problem = Either.isRight(decoded) ? decoded.right : undefined;
      if (
        response.status === 401 &&
        problem?.type === 'urn:ergon:problem:browser-authentication-required' &&
        problem.signInPath === '/bff/login'
      ) {
        return { kind: 'authentication-required' };
      }
      const kind =
        problem === undefined
          ? undefined
          : problemFailures.get(`${response.status}:${problem.type}`);
      if (kind !== undefined) return { kind };
      if (response.status === 403) return { kind: 'forbidden' };
      if (response.status >= 500 && response.status <= 599)
        return { kind: 'service-unavailable', status: response.status };
      return { kind: 'unexpected-http-status', status: response.status };
    }),
  );
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'AbortError';
}
