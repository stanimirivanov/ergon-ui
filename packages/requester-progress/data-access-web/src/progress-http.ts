import { Effect, Either, Schema } from 'effect';
import type {
  ProgressClient,
  ProgressFailure,
  ProgressQuery,
  ProgressResult,
  RequesterProgress,
  RequesterQuestionsResult,
} from './progress-client';
import {
  decodeRequesterQuestions,
  isRequesterInstant as validInstant,
} from './question-history';

const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
);
const wire = Schema.Struct({
  caseId: Schema.UUID,
  goal: Schema.NonEmptyString,
  status: Schema.Literal('OPEN', 'VERIFIED_RESOLVED'),
  openedAt: instant,
  updatedAt: instant,
});
const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
const HTTP_FAILURES: Readonly<Record<string, ProgressFailure['kind']>> = {
  '401:urn:ergon:problem:browser-authentication-required':
    'authentication-required',
  '404:urn:ergon:problem:requester-case-not-found': 'not-found',
};

/**
 * Credentialed, no-store same-origin reader. Each attempt has a positive timeout
 * (default 5 seconds); one retry is limited to transport/timeout/5xx failures.
 * Caller interruption aborts fetch and resolves request-cancelled. No problem
 * text, arbitrary redirects, raw causes or unknown response fields escape.
 * @throws RangeError for a non-positive or non-finite timeout.
 */
export function createProgressBffClient({
  fetch,
  requestTimeout = 5_000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): ProgressClient {
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0)
    throw new RangeError('Invalid request timeout');
  async function run<A>(
    request: Effect.Effect<A, ProgressFailure, never>,
    signal: AbortSignal,
  ): Promise<Either.Either<A, ProgressFailure>> {
    const program = request.pipe(
      Effect.timeoutFail({
        duration: requestTimeout,
        onTimeout: (): ProgressFailure => ({ kind: 'timeout' }),
      }),
      Effect.retry({
        times: 1,
        while: (error) =>
          ['transport', 'timeout', 'unavailable'].includes(error.kind),
      }),
    );
    try {
      const result = await Effect.runPromise(Effect.either(program), {
        signal,
      });
      return signal.aborted &&
        Either.isLeft(result) &&
        result.left.kind === 'transport'
        ? Either.left({ kind: 'request-cancelled' })
        : result;
    } catch (cause) {
      if (!signal.aborted) throw cause;
      return Either.left({ kind: 'request-cancelled' });
    }
  }
  return {
    async read(query, signal): Promise<ProgressResult> {
      return Either.match(
        await run(
          request(fetch, query).pipe(
            Effect.flatMap((response) => decode(response, query)),
          ),
          signal,
        ),
        {
          onRight: (progress): ProgressResult => ({ ok: true, progress }),
          onLeft: (error): ProgressResult => ({ ok: false, error }),
        },
      );
    },
    async readQuestions(query, signal): Promise<RequesterQuestionsResult> {
      const program = request(fetch, query, 'information-requests').pipe(
        Effect.flatMap((response) =>
          response.status === 200
            ? json(response).pipe(Effect.flatMap(decodeRequesterQuestions))
            : decodeFailure(response),
        ),
      );
      return Either.match(await run(program, signal), {
        onRight: (questions): RequesterQuestionsResult => ({
          ok: true,
          questions,
        }),
        onLeft: (error): RequesterQuestionsResult => ({ ok: false, error }),
      });
    },
  };
}
function request(
  fetch: typeof globalThis.fetch,
  query: ProgressQuery,
  resource: 'progress' | 'information-requests' = 'progress',
): Effect.Effect<Response, ProgressFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(
        `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/requester-cases/${encodeURIComponent(query.caseId)}/${resource}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal,
          headers: { Accept: 'application/json, application/problem+json' },
        },
      ),
    catch: (): ProgressFailure => ({ kind: 'transport' }),
  });
}
function json(
  response: Response,
): Effect.Effect<unknown, ProgressFailure, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: (): ProgressFailure => ({ kind: 'invalid-response' }),
  });
}
function decode(
  response: Response,
  query: ProgressQuery,
): Effect.Effect<RequesterProgress, ProgressFailure, never> {
  if (response.status === 200)
    return json(response).pipe(
      Effect.flatMap((body) => {
        const decoded = Schema.decodeUnknownEither(wire)(body);
        if (
          Either.isLeft(decoded) ||
          decoded.right.caseId.toLowerCase() !== query.caseId.toLowerCase() ||
          !validInstant(decoded.right.openedAt) ||
          !validInstant(decoded.right.updatedAt)
        ) {
          return Effect.fail<ProgressFailure>({ kind: 'invalid-response' });
        }
        // Copy only the reviewed public fields even if a future server adds private metadata.
        const { caseId, goal, status, openedAt, updatedAt } = decoded.right;
        return Effect.succeed({ caseId, goal, status, openedAt, updatedAt });
      }),
    );
  return decodeFailure(response);
}
function decodeFailure(
  response: Response,
): Effect.Effect<never, ProgressFailure, never> {
  return json(response).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.flatMap((body) => {
      const p = Schema.decodeUnknownEither(problem)(body);
      const detail = Either.isRight(p) ? p.right : undefined;
      const mapped = HTTP_FAILURES[`${response.status}:${detail?.type}`];
      const kind =
        response.status === 403
          ? 'forbidden'
          : response.status >= 500
            ? 'unavailable'
            : mapped === 'authentication-required' &&
                detail?.signInPath !== '/bff/login'
              ? 'unexpected-response'
              : (mapped ?? 'unexpected-response');
      return Effect.fail<ProgressFailure>({ kind });
    }),
  );
}
