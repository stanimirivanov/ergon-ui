import { Cause, Effect, Either, Exit, Schema } from 'effect';
import type {
  NotificationClient,
  NotificationFailure,
  NotificationResult,
} from './notification-contract';
import { parseNotificationPage } from './notification-schema';

const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
/** Same-origin/no-store GET with one 5s invocation budget including JSON. No automatic retries; finally aborts remaining bodies. */
export function createNotificationClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): NotificationClient {
  return {
    read: async (query, signal): Promise<NotificationResult> => {
      if (
        !Schema.is(Schema.UUID)(query.tenantId) ||
        !Schema.is(Schema.UUID)(query.actorId) ||
        !['requester', 'resolver'].includes(query.audience)
      )
        return { ok: false, error: { kind: 'unexpected-defect' } };
      const owned = new AbortController();
      const program = Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (stageSignal) =>
            fetch(
              '/bff/v1/tenants/' +
                encodeURIComponent(query.tenantId) +
                '/notifications',
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
          catch: (): NotificationFailure => ({ kind: 'transport' }),
        });
        const json = Effect.tryPromise({
          try: (): Promise<unknown> => response.json(),
          catch: (): NotificationFailure => ({ kind: 'invalid-response' }),
        });
        if (response.status !== 200) {
          const body = yield* json.pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          const parsed = Schema.decodeUnknownEither(problem)(body);
          const detail = Either.isRight(parsed) ? parsed.right : undefined;
          const kind: NotificationFailure['kind'] =
            response.status === 401 &&
            detail?.type ===
              'urn:ergon:problem:browser-authentication-required' &&
            detail.signInPath === '/bff/login'
              ? 'authentication-required'
              : response.status === 403
                ? 'forbidden'
                : response.status >= 500
                  ? 'unavailable'
                  : 'invalid-response';
          return yield* Effect.fail<NotificationFailure>({ kind });
        }
        const page = parseNotificationPage(yield* json, query.audience);
        return page === undefined
          ? yield* Effect.fail<NotificationFailure>({
              kind: 'invalid-response',
            })
          : page;
      }).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: (): NotificationFailure => ({ kind: 'timeout' }),
        }),
      );
      try {
        const exit = await Effect.runPromiseExit(Effect.either(program), {
          signal,
        });
        if (Exit.isFailure(exit)) {
          if (Cause.isInterruptedOnly(exit.cause))
            return { ok: false, error: { kind: 'request-cancelled' } };
          throw new Error('Unexpected notification read defect');
        }
        if (signal.aborted)
          return { ok: false, error: { kind: 'request-cancelled' } };
        return Either.match(exit.value, {
          onLeft: (error): NotificationResult => ({ ok: false, error }),
          onRight: (page): NotificationResult => ({ ok: true, page }),
        });
      } finally {
        owned.abort();
      }
    },
  };
}
