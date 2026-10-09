import { Cause, Effect, Either, Exit } from 'effect';

import type {
  AssignedRunConsoleResult,
  AssignedRunListResult,
  RunSupervisionClient,
  RunSupervisionFailure,
} from './contracts';
import { readHttpFailure, readJson } from './bff/run-supervision-http';
import {
  decodeAssignedRunConsole,
  decodeAssignedRunPage,
  isValidConsoleQuery,
  isValidListQuery,
} from './bff/run-supervision-schemas';

export interface RunSupervisionClientOptions {
  /** Fetch-compatible transport; production implementations must honor its abort signal. */
  readonly fetch: typeof globalThis.fetch;
  /** Positive finite per-attempt deadline in milliseconds; default is 10 seconds. */
  readonly requestTimeoutMs?: number;
}

/**
 * Creates same-origin, no-store reads with one classified transient retry.
 *
 * Each attempt includes body decoding in its deadline. Transport, timeout, and
 * generic 5xx failures retry once; disabled authentication and permanent failures
 * do not. Caller cancellation interrupts fetch/body work and returns cancellation.
 * Raw causes never enter Redux; unexpected Effect defects still reject.
 *
 * @throws RangeError when the configured deadline is not positive and finite.
 */
export function createRunSupervisionClient({
  fetch,
  requestTimeoutMs = 10_000,
}: RunSupervisionClientOptions): RunSupervisionClient {
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new RangeError('Run supervision timeout must be positive and finite');
  }
  return {
    listAssigned: async (query, signal): Promise<AssignedRunListResult> => {
      if (!isValidListQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      const parameters = new URLSearchParams({
        limit: String(query.limit ?? 30),
      });
      if (query.cursor !== undefined) {
        parameters.set('afterAssignedAt', query.cursor.assignedAt);
        parameters.set('afterAssignmentId', query.cursor.assignmentId);
      }
      return runRead(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/assigned?${parameters}`,
          (body) => decodeAssignedRunPage(body, query),
          signal,
        ),
        signal,
        (page) => ({ ok: true as const, page }),
      );
    },
    getConsole: async (query, signal): Promise<AssignedRunConsoleResult> => {
      if (!isValidConsoleQuery(query))
        return { ok: false, error: { kind: 'invalid-page' } };
      return runRead(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/console`,
          (body) => decodeAssignedRunConsole(body, query),
          signal,
        ),
        signal,
        (console) => ({ ok: true as const, console }),
      );
    },
  };

  function request<Value>(
    url: string,
    decode: (body: unknown) => Value | undefined,
    callerSignal: AbortSignal,
  ): Effect.Effect<Value, RunSupervisionFailure, never> {
    // The controller outlives response headers: Effect's tryPromise fetch signal
    // alone cannot guarantee that a later hanging body is physically aborted.
    return Effect.acquireUseRelease(
      Effect.sync(() => new AbortController()),
      (controller) =>
        Effect.tryPromise({
          try: () =>
            fetch(url, {
              method: 'GET',
              headers: { Accept: 'application/json, application/problem+json' },
              credentials: 'same-origin',
              cache: 'no-store',
              signal: controller.signal,
            }),
          catch: () => ({ kind: 'transport' }) as const,
        }).pipe(
          Effect.flatMap((response) =>
            response.status === 200
              ? readJson(response, callerSignal).pipe(
                  Effect.flatMap((body) => {
                    const value = decode(body);
                    return value === undefined
                      ? Effect.fail({ kind: 'invalid-response' } as const)
                      : Effect.succeed(value);
                  }),
                )
              : readHttpFailure(response, callerSignal).pipe(
                  Effect.flatMap(Effect.fail),
                ),
          ),
        ),
      (controller) => Effect.sync(() => controller.abort()),
    );
  }

  async function runRead<Value, Success>(
    program: Effect.Effect<Value, RunSupervisionFailure, never>,
    signal: AbortSignal,
    onSuccess: (value: Value) => Success,
  ): Promise<
    Success | { readonly ok: false; readonly error: RunSupervisionFailure }
  > {
    // Resource acquisition is uninterruptible; an already-ended caller must not
    // begin an HTTP request before the runtime delivers its interruption.
    if (signal.aborted) {
      return { ok: false, error: { kind: 'request-cancelled' } };
    }
    const exit = await Effect.runPromiseExit(
      Effect.either(
        program.pipe(
          Effect.timeoutFail({
            duration: requestTimeoutMs,
            onTimeout: (): RunSupervisionFailure => ({ kind: 'timeout' }),
          }),
          Effect.retry({
            times: 1,
            while: (failure) =>
              failure.kind === 'transport' ||
              failure.kind === 'timeout' ||
              failure.kind === 'service-unavailable',
          }),
        ),
      ),
      { signal },
    );
    if (Exit.isFailure(exit)) {
      // A concurrent caller abort must not disguise a genuine decoder defect.
      if (signal.aborted && Cause.isInterruptedOnly(exit.cause)) {
        return { ok: false, error: { kind: 'request-cancelled' } };
      }
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
      onRight: onSuccess,
    });
  }
}
