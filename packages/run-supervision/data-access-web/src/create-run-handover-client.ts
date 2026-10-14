import { Cause, Effect, Either, Exit } from 'effect';
import type { RunSupervisionClientOptions } from './create-run-supervision-client';
import type {
  RunSupervisorCandidateResult,
  RunSupervisorHandoverClient,
  RunSupervisorHandoverFailure,
  RunSupervisorHandoverResult,
} from './handover-contracts';
import { readJson } from './bff/run-supervision-http';
import { readHandoverFailure } from './bff/run-handover-http';
import {
  decodeCandidatePage,
  decodeHandoverCsrf,
  decodeHandoverReceipt,
  isValidCandidateQuery,
  isValidHandoverCommand,
} from './bff/run-handover-schemas';

/**
 * Execution boundary for session-CSRF handover and current-epoch recipient reads.
 * The transfer deadline includes token setup, POST and decoding. No automatic
 * transfer retry occurs, including for CSRF/5xx/timeouts. Tokens are invocation-
 * local, never retained in RTK. Aborted or malformed POST results remain uncertain.
 */
export function createRunHandoverClient({
  fetch,
  requestTimeoutMs = 10_000,
}: RunSupervisionClientOptions): RunSupervisorHandoverClient {
  return {
    async listHandoverCandidates(
      query,
      signal,
    ): Promise<RunSupervisorCandidateResult> {
      if (!isValidCandidateQuery(query))
        return { ok: false, error: { kind: 'invalid-handover' } };
      const params = new URLSearchParams({
        expectedSupervisionRevision: String(query.expectedSupervisionRevision),
        limit: String(query.limit ?? 25),
      });
      if (query.afterActorId !== undefined)
        params.set('afterActorId', query.afterActorId);
      const result = await execute(
        request(
          `/bff/v1/tenants/${query.tenantId}/resolution-runs/${query.runId}/handover-candidates?${params}`,
          { method: 'GET' },
          (body) => decodeCandidatePage(body, query),
          signal,
        ),
        signal,
        true,
      );
      return result.ok ? { ok: true, page: result.value } : result;
    },
    async handoverSupervisor(
      command,
      signal,
    ): Promise<RunSupervisorHandoverResult> {
      if (!isValidHandoverCommand(command))
        return { ok: false, error: { kind: 'invalid-handover' } };
      const program = request(
        '/bff/v1/csrf',
        { method: 'GET' },
        decodeHandoverCsrf,
        signal,
      ).pipe(
        Effect.flatMap((csrf) =>
          request(
            `/bff/v1/tenants/${command.tenantId}/resolution-runs/${command.runId}/supervisor-handovers`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
              },
              body: JSON.stringify({
                commandId: command.commandId,
                expectedSupervisionRevision:
                  command.expectedSupervisionRevision,
                supervisorActorId: command.supervisorActorId,
              }),
            },
            (body) => decodeHandoverReceipt(body, command),
            signal,
          ),
        ),
      );
      const result = await execute(program, signal, false);
      return result.ok ? { ok: true, receipt: result.value } : result;
    },
  };

  function request<A>(
    url: string,
    init: RequestInit,
    decode: (body: unknown) => A | undefined,
    signal: AbortSignal,
  ): Effect.Effect<A, RunSupervisorHandoverFailure, never> {
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
          catch: (): RunSupervisorHandoverFailure => ({ kind: 'transport' }),
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
              : readHandoverFailure(response, signal).pipe(
                  Effect.flatMap(Effect.fail),
                );
          }),
        ),
      (controller) => Effect.sync(() => controller.abort()),
    );
  }

  async function execute<A>(
    program: Effect.Effect<A, RunSupervisorHandoverFailure, never>,
    signal: AbortSignal,
    retryRead: boolean,
  ): Promise<
    | { readonly ok: true; readonly value: A }
    | { readonly ok: false; readonly error: RunSupervisorHandoverFailure }
  > {
    if (signal.aborted)
      return { ok: false, error: { kind: 'request-cancelled' } };
    const timed = program.pipe(
      Effect.timeoutFail({
        duration: requestTimeoutMs,
        onTimeout: (): RunSupervisorHandoverFailure => ({ kind: 'timeout' }),
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
}
