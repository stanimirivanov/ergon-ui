import { Cause, Effect, Either, Exit, Schema } from 'effect';

export type LocalLogoutFailure =
  | 'forbidden'
  | 'unavailable'
  | 'transport'
  | 'timeout'
  | 'invalid-response'
  | 'request-cancelled'
  | 'unexpected-defect';
/** An acknowledgement or a fresh authentication rejection, never provider/global revocation. */
export type LocalLogoutResult =
  | { readonly kind: 'signed-out' | 'sign-in-required' }
  | { readonly kind: 'failed'; readonly failure: LocalLogoutFailure };
export interface LocalLogoutClient {
  /** One fresh-CSRF/POST invocation; no automatic retry. Caller cancellation and defects are safe outcomes. */
  logout(signal: AbortSignal): Promise<LocalLogoutResult>;
}
const csrf = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.NonEmptyString.pipe(Schema.pattern(/^[^\r\n\0]+$/u)),
});
const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
const outcome = Schema.Union(
  Schema.Struct({ kind: Schema.Literal('signed-out', 'sign-in-required') }),
  Schema.Struct({
    kind: Schema.Literal('failed'),
    failure: Schema.Literal(
      'forbidden',
      'unavailable',
      'transport',
      'timeout',
      'invalid-response',
      'request-cancelled',
      'unexpected-defect',
    ),
  }),
);
/** Contain injected-client defects and strip unsolicited fields before any lifecycle state can retain them. */
export function normalizeLocalLogoutResult(value: unknown): LocalLogoutResult {
  try {
    const decoded = Schema.decodeUnknownEither(outcome)(value);
    return Either.isRight(decoded)
      ? decoded.right
      : { kind: 'failed', failure: 'unexpected-defect' };
  } catch {
    return { kind: 'failed', failure: 'unexpected-defect' };
  }
}

/**
 * Same-origin, no-store session retirement with one budget including both bodies.
 * CSRF stays invocation-local; redirects, arbitrary problems and raw diagnostics
 * never become acknowledgements. A failed POST can already have committed.
 * @throws RangeError for a non-positive/non-finite timeout.
 */
export function createLocalLogoutClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): LocalLogoutClient {
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0)
    throw new RangeError('Invalid logout timeout');
  return {
    async logout(signal): Promise<LocalLogoutResult> {
      const owned = new AbortController();
      const send = (
        path: string,
        init: RequestInit,
      ): Effect.Effect<Response, LocalLogoutFailure> =>
        Effect.tryPromise({
          try: (stage) =>
            fetch(path, {
              ...init,
              credentials: 'same-origin',
              cache: 'no-store',
              redirect: 'error',
              signal: AbortSignal.any([owned.signal, stage]),
            }),
          catch: (): LocalLogoutFailure => 'transport',
        });
      const json = (
        response: Response,
      ): Effect.Effect<unknown, LocalLogoutFailure> =>
        Effect.tryPromise({
          try: (): Promise<unknown> => response.json(),
          catch: (): LocalLogoutFailure => 'invalid-response',
        });
      const rejected = (
        response: Response,
      ): Effect.Effect<LocalLogoutResult, LocalLogoutFailure> =>
        Effect.gen(function* () {
          const body = yield* json(response).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          const detail = Schema.decodeUnknownEither(problem)(body);
          if (
            response.status === 401 &&
            Either.isRight(detail) &&
            detail.right.type ===
              'urn:ergon:problem:browser-authentication-required' &&
            detail.right.signInPath === '/bff/login'
          )
            return { kind: 'sign-in-required' } as const;
          return yield* Effect.fail<LocalLogoutFailure>(
            response.status === 403
              ? 'forbidden'
              : response.status >= 500
                ? 'unavailable'
                : 'invalid-response',
          );
        });
      const program = Effect.gen(function* () {
        const setup = yield* send('/bff/v1/csrf', {
          method: 'GET',
          headers: { Accept: 'application/json, application/problem+json' },
        });
        if (setup.status !== 200) return yield* rejected(setup);
        const token = Schema.decodeUnknownEither(csrf)(yield* json(setup));
        if (Either.isLeft(token))
          return yield* Effect.fail<LocalLogoutFailure>('invalid-response');
        const response = yield* send('/bff/logout', {
          method: 'POST',
          headers: {
            Accept: 'application/problem+json',
            [token.right.headerName]: token.right.token,
          },
        });
        if (response.status !== 204) return yield* rejected(response);
        const body = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: (): LocalLogoutFailure => 'invalid-response',
        });
        return body === ''
          ? ({ kind: 'signed-out' } as const)
          : yield* Effect.fail<LocalLogoutFailure>('invalid-response');
      }).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: (): LocalLogoutFailure => 'timeout',
        }),
      );
      try {
        const result = await Effect.runPromiseExit(Effect.either(program), {
          signal,
        });
        if (Exit.isFailure(result))
          return {
            kind: 'failed',
            failure: Cause.isInterruptedOnly(result.cause)
              ? 'request-cancelled'
              : 'unexpected-defect',
          };
        if (signal.aborted)
          return { kind: 'failed', failure: 'request-cancelled' };
        return Either.match(result.value, {
          onLeft: (failure): LocalLogoutResult => ({ kind: 'failed', failure }),
          onRight: (value) => value,
        });
      } catch {
        return { kind: 'failed', failure: 'unexpected-defect' };
      } finally {
        owned.abort();
      }
    },
  };
}
