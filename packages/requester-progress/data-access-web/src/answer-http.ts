import { Cause, Effect, Either, Exit, Schema } from 'effect';
import type {
  RequesterAnswerClient,
  RequesterAnswerCommand,
  RequesterAnswerFailure,
  RequesterAnswerResult,
} from './answer-client';
import {
  requesterInstantSchema,
  requesterTextSchema,
} from './question-history';

const tokenSchema = Schema.Struct({
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
const commandSchema = Schema.Struct({
  tenantId: Schema.UUID,
  caseId: Schema.UUID,
  requestId: Schema.UUID,
  responseId: Schema.UUID,
  answer: requesterTextSchema,
});
const receiptSchema = Schema.Struct({
  responseId: Schema.UUID,
  requestId: Schema.UUID,
  caseId: Schema.UUID,
  answer: requesterTextSchema,
  respondedAt: requesterInstantSchema,
  recordedAt: requesterInstantSchema,
});
const problemSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});
const PROBLEM_KINDS: Readonly<Record<string, RequesterAnswerFailure['kind']>> =
  {
    '404:urn:ergon:problem:requester-response-not-found': 'not-found',
    '409:urn:ergon:problem:requester-response-conflict': 'answer-conflict',
    '400:urn:ergon:problem:invalid-requester-response': 'invalid-answer',
    '403:urn:ergon:problem:invalid-browser-csrf-token': 'csrf-rejected',
  };

/** Invocation-local CSRF and a single bounded POST; no token cache, receipt cache, automatic retries or diagnostic causes escape. */
export function createRequesterAnswerRecorder(
  fetch: typeof globalThis.fetch,
  requestTimeout: number,
): RequesterAnswerClient['recordAnswer'] {
  return async (command, signal): Promise<RequesterAnswerResult> => {
    if (!Schema.is(commandSchema)(command))
      return { ok: false, error: { kind: 'invalid-answer' } };
    const program = Effect.gen(function* () {
      const csrf = yield* send(fetch, '/bff/v1/csrf', { method: 'GET' });
      if (csrf.status !== 200) return yield* failure(csrf, 'csrf');
      const token = Schema.decodeUnknownEither(tokenSchema)(yield* json(csrf));
      if (Either.isLeft(token))
        return yield* Effect.fail<RequesterAnswerFailure>({
          kind: 'invalid-response',
        });
      const response = yield* send(
        fetch,
        `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/requester-cases/${encodeURIComponent(command.caseId)}/information-requests/${encodeURIComponent(command.requestId)}/responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [token.right.headerName]: token.right.token,
          },
          body: JSON.stringify({
            responseId: command.responseId,
            answer: command.answer,
          }),
        },
      );
      if (response.status !== 200 && response.status !== 201)
        return yield* failure(response, 'answer');
      const decoded = Schema.decodeUnknownEither(receiptSchema)(
        yield* json(response),
      );
      if (Either.isLeft(decoded) || !matches(decoded.right, command))
        return yield* Effect.fail<RequesterAnswerFailure>({
          kind: 'invalid-response',
        });
      // A historical acknowledgement is deliberately not inserted into the history cache.
      return command.responseId;
    }).pipe(
      Effect.timeoutFail({
        duration: requestTimeout,
        onTimeout: (): RequesterAnswerFailure => ({ kind: 'timeout' }),
      }),
    );
    const exit = await Effect.runPromiseExit(Effect.either(program), {
      signal,
    });
    if (Exit.isFailure(exit)) {
      if (Cause.isInterruptedOnly(exit.cause))
        return { ok: false, error: { kind: 'request-cancelled' } };
      throw new Error('Unexpected requester answer defect');
    }
    const result = exit.value;
    return Either.match(result, {
      onRight: (responseId): RequesterAnswerResult => ({
        ok: true,
        responseId,
      }),
      onLeft: (error): RequesterAnswerResult => ({
        ok: false,
        error:
          signal.aborted && error.kind === 'transport'
            ? { kind: 'request-cancelled' }
            : error,
      }),
    });
  };
}
function matches(
  receipt: typeof receiptSchema.Type,
  command: RequesterAnswerCommand,
): boolean {
  return (
    receipt.responseId.toLowerCase() === command.responseId.toLowerCase() &&
    receipt.requestId.toLowerCase() === command.requestId.toLowerCase() &&
    receipt.caseId.toLowerCase() === command.caseId.toLowerCase() &&
    receipt.answer === command.answer
  );
}
function send(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
): Effect.Effect<Response, RequesterAnswerFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(url, {
        ...init,
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
        headers: {
          Accept: 'application/json, application/problem+json',
          ...init.headers,
        },
      }),
    catch: (): RequesterAnswerFailure => ({ kind: 'transport' }),
  });
}
function json(
  response: Response,
): Effect.Effect<unknown, RequesterAnswerFailure, never> {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: (): RequesterAnswerFailure => ({ kind: 'invalid-response' }),
  });
}
function failure(
  response: Response,
  stage: 'csrf' | 'answer',
): Effect.Effect<never, RequesterAnswerFailure, never> {
  return json(response).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.flatMap((body) => {
      const parsed = Schema.decodeUnknownEither(problemSchema)(body);
      const detail = Either.isRight(parsed) ? parsed.right : undefined;
      const mapped = PROBLEM_KINDS[`${response.status}:${detail?.type}`];
      // Setup cannot reject an answer or justify editing a retained POST intent.
      const scoped =
        stage === 'answer' || mapped === 'csrf-rejected' ? mapped : undefined;
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
      return Effect.fail<RequesterAnswerFailure>({ kind });
    }),
  );
}
