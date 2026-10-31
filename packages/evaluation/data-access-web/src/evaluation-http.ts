import { Cause, Effect, Either, Exit, Schema } from 'effect';
import type {
  EvaluationClient,
  EvaluationFailure,
  EvaluationResult,
} from './evaluation-contract';
import {
  parseEvaluationPage,
  parseEvaluationReport,
} from './evaluation-schema';
import type { EvaluationPage, EvaluationReport } from '@ergon/evaluation-model';

const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
/** Same-origin/no-store GET with one 5s invocation budget including JSON. No automatic retries; finally aborts remaining bodies. */
export function createEvaluationClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): EvaluationClient {
  return {
    read: async (
      query,
      signal,
    ): Promise<EvaluationResult<EvaluationPage | EvaluationReport>> => {
      if (
        !Schema.is(Schema.UUID)(query.tenantId) ||
        !Schema.is(Schema.UUID)(query.actorId) ||
        !Schema.is(Schema.UUID)(
          'reportId' in query
            ? query.reportId
            : (query.after ?? query.tenantId),
        )
      )
        return { ok: false, error: { kind: 'unexpected-defect' } };
      if (signal.aborted)
        return { ok: false, error: { kind: 'request-cancelled' } };
      const owned = new AbortController();
      const abort = (): void => owned.abort();
      signal.addEventListener('abort', abort, { once: true });
      const program = Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (stageSignal) =>
            fetch(
              '/bff/v1/tenants/' +
                encodeURIComponent(query.tenantId) +
                '/simulation-lab/reports' +
                ('reportId' in query
                  ? '/' + encodeURIComponent(query.reportId)
                  : '?limit=20' +
                    (query.after === null
                      ? ''
                      : '&after=' + encodeURIComponent(query.after))),
              {
                credentials: 'same-origin',
                cache: 'no-store',
                method: 'GET',
                headers: {
                  Accept: 'application/json, application/problem+json',
                },
                signal: AbortSignal.any([stageSignal, owned.signal]),
              },
            ),
          catch: (): EvaluationFailure => ({ kind: 'transport' }),
        });
        const json = Effect.tryPromise({
          try: async (): Promise<unknown> => {
            if (response.body === null) throw new Error('Missing body');
            const reader = response.body.getReader();
            const cancel = (): void => {
              void reader.cancel().catch(() => undefined);
            };
            owned.signal.addEventListener('abort', cancel, { once: true });
            const decoder = new TextDecoder('utf-8', { fatal: true });
            let size = 0;
            let text = '';
            try {
              while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                size += chunk.value.byteLength;
                if (size > 2_097_152) throw new Error('Response limit');
                text += decoder.decode(chunk.value, { stream: true });
              }
              return JSON.parse(text + decoder.decode()) as unknown;
            } finally {
              owned.signal.removeEventListener('abort', cancel);
              cancel();
            }
          },
          catch: (): EvaluationFailure => ({ kind: 'invalid-response' }),
        });
        if (response.status !== 200) {
          const body = yield* json.pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          const parsed = Schema.decodeUnknownEither(problem)(body);
          const detail = Either.isRight(parsed) ? parsed.right : undefined;
          const kind: EvaluationFailure['kind'] =
            response.status === 401 &&
            detail?.type ===
              'urn:ergon:problem:browser-authentication-required' &&
            detail.signInPath === '/bff/login'
              ? 'authentication-required'
              : response.status === 403 || response.status === 404
                ? 'denied'
                : response.status >= 500
                  ? 'unavailable'
                  : 'invalid-response';
          return yield* Effect.fail<EvaluationFailure>({ kind });
        }
        const body = yield* json;
        const page =
          'reportId' in query
            ? parseEvaluationReport(body, query.reportId)
            : parseEvaluationPage(body, query.after);
        return page === undefined
          ? yield* Effect.fail<EvaluationFailure>({
              kind: 'invalid-response',
            })
          : page;
      }).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: (): EvaluationFailure => ({ kind: 'timeout' }),
        }),
      );
      try {
        const exit = await Effect.runPromiseExit(Effect.either(program), {
          signal,
        });
        if (Exit.isFailure(exit)) {
          if (Cause.isInterruptedOnly(exit.cause))
            return { ok: false, error: { kind: 'request-cancelled' } };
          throw new Error('Unexpected evaluation read defect');
        }
        if (signal.aborted)
          return { ok: false, error: { kind: 'request-cancelled' } };
        return Either.match(exit.value, {
          onLeft: (
            error,
          ): EvaluationResult<EvaluationPage | EvaluationReport> => ({
            ok: false,
            error,
          }),
          onRight: (
            page,
          ): EvaluationResult<EvaluationPage | EvaluationReport> => ({
            ok: true,
            value: page,
          }),
        });
      } finally {
        signal.removeEventListener('abort', abort);
        owned.abort();
      }
    },
  };
}
