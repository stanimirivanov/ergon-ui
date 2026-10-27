import { Cause, Effect, Either, Exit, Schema } from 'effect';
import type {
  IntakeClient,
  IntakeCommand,
  IntakeFailure,
  IntakeResult,
} from './intake-contract';
import {
  normalizeIntakeGoal,
  normalizeIntakeObservation,
} from './intake-input';

const commandSchema = Schema.Struct({
  tenantId: Schema.UUID,
  caseId: Schema.UUID,
  goal: Schema.String.pipe(
    Schema.filter((value) => normalizeIntakeGoal(value) !== undefined),
  ),
  initialObservation: Schema.String.pipe(
    Schema.filter((value) => normalizeIntakeObservation(value) !== undefined),
  ),
});
const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u),
  Schema.filter(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(Date.parse(value)).toISOString().slice(0, 19) ===
        value.slice(0, 19),
  ),
);
const receipt = Schema.Struct({
  caseId: Schema.UUID,
  goal: Schema.String,
  initialObservation: Schema.String,
  openedAt: instant,
  recordedAt: instant,
});
const csrf = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.String.pipe(
    Schema.filter(
      (value) =>
        value.trim().length > 0 &&
        value.length <= 4096 &&
        !/[\r\n]/u.test(value),
    ),
  ),
});
const problem = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
const problems: Readonly<Record<string, IntakeFailure['kind']>> = {
  '400:urn:ergon:problem:invalid-requester-case-intake': 'invalid-input',
  '409:urn:ergon:problem:requester-case-intake-conflict': 'intake-conflict',
  '403:urn:ergon:problem:invalid-browser-csrf-token': 'csrf-rejected',
};

/** Same-origin, no-store intake with one 5s CSRF+POST budget (overridable for tests). No automatic retries or token/receipt caching; only exact normalized receipts acknowledge intent. */
export function createIntakeBffClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): IntakeClient {
  return {
    submit: async (command, signal): Promise<IntakeResult> => {
      if (!Schema.is(commandSchema)(command))
        return { ok: false, error: { kind: 'invalid-input' } };
      // Fetch resolves at headers; retain ownership until every response body settles.
      const invocation = new AbortController();
      const program = Effect.gen(function* () {
        const setup = yield* send(
          fetch,
          '/bff/v1/csrf',
          { method: 'GET' },
          invocation.signal,
        );
        if (setup.status !== 200) return yield* reject(setup, 'csrf');
        const token = Schema.decodeUnknownEither(csrf)(yield* json(setup));
        if (Either.isLeft(token))
          return yield* Effect.fail<IntakeFailure>({
            kind: 'invalid-response',
          });
        const response = yield* send(
          fetch,
          '/bff/v1/tenants/' +
            encodeURIComponent(command.tenantId) +
            '/requester-cases',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [token.right.headerName]: token.right.token,
            },
            body: JSON.stringify({
              caseId: command.caseId,
              goal: command.goal,
              initialObservation: command.initialObservation,
            }),
          },
          invocation.signal,
        );
        if (response.status !== 200 && response.status !== 201)
          return yield* reject(response, 'intake');
        const decoded = Schema.decodeUnknownEither(receipt)(
          yield* json(response),
        );
        if (Either.isLeft(decoded) || !matches(decoded.right, command))
          return yield* Effect.fail<IntakeFailure>({
            kind: 'invalid-response',
          });
        return command.caseId;
      }).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: (): IntakeFailure => ({ kind: 'timeout' }),
        }),
      );
      try {
        const exit = await Effect.runPromiseExit(Effect.either(program), {
          signal,
        });
        if (Exit.isFailure(exit)) {
          if (Cause.isInterruptedOnly(exit.cause))
            return { ok: false, error: { kind: 'request-cancelled' } };
          throw new Error('Unexpected requester intake defect');
        }
        return Either.match(exit.value, {
          onRight: (caseId): IntakeResult => ({ ok: true, caseId }),
          onLeft: (error): IntakeResult => ({
            ok: false,
            error:
              signal.aborted && error.kind === 'transport'
                ? { kind: 'request-cancelled' }
                : error,
          }),
        });
      } finally {
        invocation.abort();
      }
    },
  };
}
function matches(value: typeof receipt.Type, command: IntakeCommand): boolean {
  return (
    value.caseId.toLowerCase() === command.caseId.toLowerCase() &&
    value.goal === normalizeIntakeGoal(command.goal) &&
    value.initialObservation ===
      normalizeIntakeObservation(command.initialObservation)
  );
}
function send(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  invocationSignal: AbortSignal,
): Effect.Effect<Response, IntakeFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(url, {
        ...init,
        signal: AbortSignal.any([signal, invocationSignal]),
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, application/problem+json',
          ...init.headers,
        },
      }),
    catch: (): IntakeFailure => ({ kind: 'transport' }),
  });
}
function json(
  response: Response,
): Effect.Effect<unknown, IntakeFailure, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: (): IntakeFailure => ({ kind: 'invalid-response' }),
  });
}
function reject(
  response: Response,
  stage: 'csrf' | 'intake',
): Effect.Effect<never, IntakeFailure, never> {
  return json(response).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.flatMap((body) => {
      const decoded = Schema.decodeUnknownEither(problem)(body);
      const detail = Either.isRight(decoded) ? decoded.right : undefined;
      const mapped = problems[response.status + ':' + detail?.type];
      // A setup error cannot reject an intake or justify replacing uncertain intent.
      const scoped =
        stage === 'intake' || mapped === 'csrf-rejected' ? mapped : undefined;
      const kind =
        response.status === 401 &&
        detail?.type === 'urn:ergon:problem:browser-authentication-required' &&
        detail.signInPath === '/bff/login'
          ? 'authentication-required'
          : (scoped ??
            (response.status === 403
              ? 'forbidden'
              : response.status >= 500
                ? 'unavailable'
                : 'unexpected-response'));
      return Effect.fail<IntakeFailure>({ kind });
    }),
  );
}
