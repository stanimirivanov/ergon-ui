import { Cause, Effect, Either, Exit } from 'effect';
import type { RunSupervisionFailure } from '../contracts';
import type { RunSupervisionClientOptions } from '../create-run-supervision-client';
import { readJson } from './run-supervision-http';

interface RunCommandHttp<F> {
  readonly request: <A>(
    url: string,
    init: RequestInit,
    decode: (body: unknown) => A | undefined,
    signal: AbortSignal,
  ) => Effect.Effect<A, F | RunSupervisionFailure, never>;
  readonly execute: <A>(
    program: Effect.Effect<A, F | RunSupervisionFailure, never>,
    signal: AbortSignal,
    retryRead: boolean,
  ) => Promise<
    | { readonly ok: true; readonly value: A }
    | { readonly ok: false; readonly error: F | RunSupervisionFailure }
  >;
}

/**
 * Shared transport lifetime for the currently implemented supervision commands.
 * Each request controller covers headers and body and is released on every path.
 * execute bounds the complete supplied program; only explicitly classified reads
 * retry. Mutation callers put CSRF and POST in one program and pass retryRead=false.
 * Genuine defects reject, including concurrent aborts; causes never become results.
 */
export function createRunCommandHttp<F extends { readonly kind: string }>(
  { fetch, requestTimeoutMs = 10_000 }: RunSupervisionClientOptions,
  readFailure: (
    response: Response,
    signal: AbortSignal,
  ) => Effect.Effect<F, F | RunSupervisionFailure, never>,
): RunCommandHttp<F> {
  function request<A>(
    url: string,
    init: RequestInit,
    decode: (body: unknown) => A | undefined,
    signal: AbortSignal,
  ): Effect.Effect<A, F | RunSupervisionFailure, never> {
    return Effect.acquireUseRelease(
      Effect.sync(() => new AbortController()),
      (controller) =>
        Effect.tryPromise({
          try: () =>
            fetch(url, {
              ...init,
              credentials: 'same-origin',
              cache: 'no-store',
              headers: {
                Accept: 'application/json, application/problem+json',
                ...init.headers,
              },
              signal: controller.signal,
            }),
          catch: (): RunSupervisionFailure => ({ kind: 'transport' }),
        }).pipe(
          Effect.flatMap((response) => {
            const success =
              response.status === 200 ||
              (init.method === 'POST' && response.status === 201);
            return success
              ? readJson(response, signal).pipe(
                  Effect.flatMap((body) => {
                    const value = decode(body);
                    return value === undefined
                      ? Effect.fail({ kind: 'invalid-response' } as const)
                      : Effect.succeed(value);
                  }),
                )
              : readFailure(response, signal).pipe(Effect.flatMap(Effect.fail));
          }),
        ),
      (controller) => Effect.sync(() => controller.abort()),
    );
  }
  async function execute<A>(
    program: Effect.Effect<A, F | RunSupervisionFailure, never>,
    signal: AbortSignal,
    retryRead: boolean,
  ): Promise<
    | { readonly ok: true; readonly value: A }
    | { readonly ok: false; readonly error: F | RunSupervisionFailure }
  > {
    if (signal.aborted)
      return { ok: false, error: { kind: 'request-cancelled' } };
    const timed = program.pipe(
      Effect.timeoutFail({
        duration: requestTimeoutMs,
        onTimeout: (): RunSupervisionFailure => ({ kind: 'timeout' }),
      }),
    );
    const bounded = retryRead
      ? timed.pipe(
          Effect.retry({
            times: 1,
            while: (failure) =>
              failure.kind === 'transport' ||
              failure.kind === 'timeout' ||
              failure.kind === 'service-unavailable',
          }),
        )
      : timed;
    const exit = await Effect.runPromiseExit(Effect.either(bounded), {
      signal,
    });
    if (Exit.isFailure(exit)) {
      if (signal.aborted && Cause.isInterruptedOnly(exit.cause))
        return { ok: false, error: { kind: 'request-cancelled' } };
      throw Cause.squash(exit.cause);
    }
    return Either.match(exit.value, {
      onLeft: (error) => ({
        ok: false as const,
        error:
          signal.aborted && error.kind === 'transport'
            ? { kind: 'request-cancelled' as const }
            : error,
      }),
      onRight: (value) => ({ ok: true as const, value }),
    });
  }
  return { request, execute };
}
