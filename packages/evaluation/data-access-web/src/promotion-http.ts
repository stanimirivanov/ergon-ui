import { Cause, Effect, Either, Exit, Schema } from 'effect';
import type {
  PromotionInput,
  PromotionCommand,
  PromotionReview,
  PromotionReceipt,
} from '@ergon/evaluation-model';
import {
  inputSchema,
  commandSchema,
  parsePromotionReview,
  parsePromotionReceipt,
} from './promotion-schema';
export type PromotionFailure = {
  readonly kind:
    | 'authentication-required'
    | 'denied'
    | 'unavailable'
    | 'transport'
    | 'timeout'
    | 'request-cancelled'
    | 'invalid-response'
    | 'unexpected-defect'
    | 'conflict'
    | 'invalid-input';
};
export type PromotionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PromotionFailure };
/** Invocation-local CSRF and five-second bounded POST. No retries; confirmation replay uses the original immutable command. Defects reject into the RTK boundary. */
export interface PromotionClient {
  read(
    query: PromotionInput | PromotionCommand,
    signal: AbortSignal,
  ): Promise<PromotionResult<PromotionReview | PromotionReceipt>>;
}
const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
/** Same-origin/no-store CSRF acquisition and POST with one 5s budget including JSON. No automatic retries; finally aborts remaining bodies. */
export function createPromotionClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): PromotionClient {
  return {
    read: async (
      query,
      signal,
    ): Promise<PromotionResult<PromotionReview | PromotionReceipt>> => {
      const isCommand = 'commandId' in query;
      if (
        !(isCommand
          ? Schema.is(commandSchema)(query)
          : Schema.is(inputSchema)(query))
      )
        return { ok: false, error: { kind: 'invalid-input' } };
      if (signal.aborted)
        return { ok: false, error: { kind: 'request-cancelled' } };
      const owned = new AbortController();
      const abort = (): void => owned.abort();
      signal.addEventListener('abort', abort, { once: true });
      const program = Effect.gen(function* () {
        const csrfResponse = yield* Effect.tryPromise({
          try: (stageSignal) =>
            fetch('/bff/v1/csrf', {
              method: 'GET',
              credentials: 'same-origin',
              cache: 'no-store',
              signal: AbortSignal.any([stageSignal, owned.signal]),
            }),
          catch: (): PromotionFailure => ({ kind: 'transport' }),
        });
        if (csrfResponse.status !== 200)
          return yield* Effect.fail<PromotionFailure>({
            kind:
              csrfResponse.status === 401
                ? 'authentication-required'
                : csrfResponse.status === 403
                  ? 'denied'
                  : 'unavailable',
          });
        const csrfValue = yield* Effect.tryPromise({
          try: (): Promise<unknown> => csrfResponse.json(),
          catch: (): PromotionFailure => ({ kind: 'invalid-response' }),
        });
        const csrf = Schema.decodeUnknownEither(
          Schema.Struct({
            headerName: Schema.Literal('X-CSRF-TOKEN'),
            token: Schema.String.pipe(
              Schema.minLength(1),
              Schema.maxLength(4096),
              Schema.pattern(/^[^\r\n]+$/u),
            ),
          }),
        )(csrfValue);
        if (Either.isLeft(csrf))
          return yield* Effect.fail<PromotionFailure>({
            kind: 'invalid-response',
          });
        if (signal.aborted)
          return yield* Effect.fail<PromotionFailure>({
            kind: 'request-cancelled',
          });
        const path =
          '/bff/v1/tenants/' +
          encodeURIComponent(query.tenantId) +
          '/simulation-lab/' +
          ('commandId' in query
            ? 'promotion-commands/' + query.commandId
            : 'contracts/' +
              encodeURIComponent(query.contractKey) +
              '/promotion-review');
        const body =
          'commandId' in query
            ? {
                schemaVersion: 'ergon.contract-promotion/command/v1',
                ...Schema.decodeUnknownSync(commandSchema)(query).intent,
              }
            : {
                schemaVersion: 'ergon.simulation-lab/review/v1',
                reports: Schema.decodeUnknownSync(inputSchema)(query).reports,
                rationale: query.rationale,
              };
        if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 131072)
          return yield* Effect.fail<PromotionFailure>({
            kind: 'invalid-input',
          });
        const response = yield* Effect.tryPromise({
          try: (stageSignal) =>
            fetch(path, {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: {
                Accept: 'application/json, application/problem+json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf.right.token,
              },
              body: JSON.stringify(body),
              signal: AbortSignal.any([stageSignal, owned.signal]),
            }),
          catch: (): PromotionFailure => ({ kind: 'transport' }),
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
          catch: (): PromotionFailure => ({ kind: 'invalid-response' }),
        });
        if (
          response.status !== 200 &&
          !(isCommand && response.status === 201)
        ) {
          const body = yield* json.pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          const parsed = Schema.decodeUnknownEither(problem)(body);
          const detail = Either.isRight(parsed) ? parsed.right : undefined;
          const kind: PromotionFailure['kind'] =
            response.status === 401 &&
            detail?.type ===
              'urn:ergon:problem:browser-authentication-required' &&
            detail.signInPath === '/bff/login'
              ? 'authentication-required'
              : response.status === 403 || response.status === 404
                ? 'denied'
                : response.status === 409
                  ? 'conflict'
                  : response.status === 422 || response.status === 413
                    ? 'invalid-input'
                    : response.status >= 500
                      ? 'unavailable'
                      : 'invalid-response';
          return yield* Effect.fail<PromotionFailure>({ kind });
        }
        const responseBody = yield* json;
        const page =
          'commandId' in query
            ? parsePromotionReceipt(responseBody, query)
            : parsePromotionReview(responseBody, query);
        return page === undefined
          ? yield* Effect.fail<PromotionFailure>({
              kind: 'invalid-response',
            })
          : page;
      }).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: (): PromotionFailure => ({ kind: 'timeout' }),
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
          ): PromotionResult<PromotionReview | PromotionReceipt> => ({
            ok: false,
            error,
          }),
          onRight: (
            page,
          ): PromotionResult<PromotionReview | PromotionReceipt> => ({
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
