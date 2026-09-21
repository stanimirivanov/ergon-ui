import { Effect, Either, Schema } from 'effect';

const utcInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
);

const currentActorResponseSchema = Schema.Struct({
  actorId: Schema.UUID,
  identityProvider: Schema.NonEmptyString,
  registeredAt: utcInstant,
  recordedAt: utcInstant,
});

const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  title: Schema.String,
  status: Schema.Number,
  detail: Schema.String,
  instance: Schema.optional(Schema.String),
  signInPath: Schema.optional(Schema.String),
});

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;

export interface CurrentActor {
  readonly actorId: string;
  readonly identityProvider: string;
  readonly registeredAt: string;
  readonly recordedAt: string;
}

export type CurrentActorFailure =
  | {
      readonly kind: 'authentication-required';
      readonly signInPath: typeof BROWSER_SIGN_IN_PATH;
    }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'request-cancelled' };

export type CurrentActorResult =
  | { readonly ok: true; readonly actor: CurrentActor }
  | { readonly ok: false; readonly error: CurrentActorFailure };

export interface CurrentActorClient {
  resolve(tenantId: string, signal: AbortSignal): Promise<CurrentActorResult>;
}

interface CurrentActorClientOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}

const TRANSPORT_FAILURE: CurrentActorFailure = { kind: 'transport' };
const INVALID_RESPONSE: CurrentActorFailure = { kind: 'invalid-response' };
const REQUEST_CANCELLED: CurrentActorFailure = { kind: 'request-cancelled' };

/**
 * Creates the current-actor HTTP boundary.
 *
 * The returned client executes same-origin session HTTP, cancellation, one
 * bounded retry for transient failures, timeout enforcement, and schema
 * decoding as an Effect program. Its promise result is deliberately
 * serializable for RTK Query and contains no provider credentials.
 */
export function createCurrentActorClient({
  fetch,
  requestTimeout = 5_000,
}: CurrentActorClientOptions): CurrentActorClient {
  return {
    async resolve(tenantId, signal) {
      const program = requestCurrentActor(fetch, tenantId).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => ({ kind: 'timeout' }) as const,
        }),
        Effect.retry({ times: 1, while: isRetryable }),
      );

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        return Either.match(result, {
          onLeft: (error): CurrentActorResult => ({ ok: false, error }),
          onRight: (actor): CurrentActorResult => ({ ok: true, actor }),
        });
      } catch {
        // RTK Query owns cancellation; translating interruption prevents rejected
        // promises from escaping its queryFn contract.
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
  };
}

function requestCurrentActor(fetch: typeof globalThis.fetch, tenantId: string) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(`/bff/v1/tenants/${encodeURIComponent(tenantId)}/session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeResponse));
}

function decodeResponse(response: Response) {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(currentActorResponseSchema)),
      Effect.map((actor): CurrentActor => ({
        actorId: actor.actorId,
        identityProvider: actor.identityProvider,
        registeredAt: actor.registeredAt,
        recordedAt: actor.recordedAt,
      })),
      Effect.mapError(() => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapHttpFailure(response.status, problem)),
    ),
  );
}

function readJson(response: Response) {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: () => INVALID_RESPONSE,
  });
}

function readOptionalProblem(response: Response) {
  return Effect.tryPromise({
    try: (): Promise<unknown> => response.json(),
    catch: () => INVALID_RESPONSE,
  }).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.map((body) => {
      const decoded = Schema.decodeUnknownEither(problemDetailSchema)(body);
      return Either.isRight(decoded) ? decoded.right : undefined;
    }),
  );
}

function mapHttpFailure(
  status: number,
  problem?: {
    readonly type: string;
    readonly signInPath?: string | undefined;
  },
): CurrentActorFailure {
  if (
    status === 401 &&
    problem?.type === 'urn:ergon:problem:browser-authentication-required' &&
    problem.signInPath === BROWSER_SIGN_IN_PATH
  ) {
    return {
      kind: 'authentication-required',
      signInPath: BROWSER_SIGN_IN_PATH,
    };
  }
  if (
    status === 403 &&
    problem?.type === 'urn:ergon:problem:human-actor-not-registered'
  ) {
    return { kind: 'actor-not-registered' };
  }
  if (
    status === 403 &&
    (problem?.type === 'urn:ergon:problem:untrusted-human-identity-issuer' ||
      problem?.type ===
        'urn:ergon:problem:invalid-authenticated-human-identity')
  ) {
    return { kind: 'identity-rejected' };
  }
  if (status === 403) {
    return { kind: 'forbidden' };
  }
  if (
    status === 503 &&
    problem?.type === 'urn:ergon:problem:browser-authentication-unavailable'
  ) {
    return { kind: 'authentication-unavailable' };
  }
  if (status >= 500) {
    return { kind: 'service-unavailable', status };
  }
  return { kind: 'unexpected-response', status };
}

function isRetryable(failure: CurrentActorFailure): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}
