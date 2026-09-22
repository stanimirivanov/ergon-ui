import { Effect, Either, Schema } from 'effect';

const utcInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => !Number.isNaN(Date.parse(value))),
);
const queueKey = Schema.String.pipe(Schema.pattern(/^[a-z][a-z0-9-]{0,62}$/));
const cursorSchema = Schema.Struct({
  afterOpenedAt: utcInstant,
  afterWorkItemId: Schema.UUID,
});
const workItemSchema = Schema.Struct({
  workItemId: Schema.UUID,
  caseId: Schema.UUID,
  runId: Schema.UUID,
  escalationEventId: Schema.UUID,
  reason: Schema.NonEmptyString,
  queueKey,
  status: Schema.Literal('OPEN'),
  openedAt: utcInstant,
  recordedAt: utcInstant,
});
const pageSchema = Schema.Struct({
  items: Schema.Array(workItemSchema),
  nextCursor: Schema.NullOr(cursorSchema),
});
const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;

/** Exact oldest-first keyset position; both values must travel together. */
export interface HumanFollowUpCursor {
  readonly afterOpenedAt: string;
  readonly afterWorkItemId: string;
}

export interface HumanFollowUpWorkItem {
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly escalationEventId: string;
  readonly reason: string;
  readonly queueKey: string;
  readonly status: 'OPEN';
  readonly openedAt: string;
  readonly recordedAt: string;
}

export interface HumanFollowUpPage {
  readonly items: readonly HumanFollowUpWorkItem[];
  readonly nextCursor: HumanFollowUpCursor | null;
}

/** Bounded inbox request scoped to one tenant and optional exact queue. */
export interface HumanFollowUpQuery {
  readonly tenantId: string;
  readonly queueKey?: string;
  readonly limit: number;
  readonly cursor?: HumanFollowUpCursor;
}

export type HumanFollowUpFailure =
  | {
      readonly kind: 'authentication-required';
      readonly signInPath: typeof BROWSER_SIGN_IN_PATH;
    }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'invalid-filter' }
  | { readonly kind: 'invalid-page' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'request-cancelled' };

export type HumanFollowUpResult =
  | { readonly ok: true; readonly page: HumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

export interface HumanFollowUpClient {
  listOpen(
    query: HumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<HumanFollowUpResult>;
}

interface HumanFollowUpClientOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}

const TRANSPORT_FAILURE: HumanFollowUpFailure = { kind: 'transport' };
const INVALID_RESPONSE: HumanFollowUpFailure = { kind: 'invalid-response' };
const REQUEST_CANCELLED: HumanFollowUpFailure = {
  kind: 'request-cancelled',
};

/**
 * Creates the HTTP boundary for the shared human follow-up inbox.
 *
 * The client validates the complete browser DTO before returning it, retains
 * both keyset values as one cursor, and retries only transient reads. Its
 * serializable result is safe for RTK Query and excludes identity-provider
 * data and credentials.
 */
export function createHumanFollowUpClient({
  fetch,
  requestTimeout = 5_000,
}: HumanFollowUpClientOptions): HumanFollowUpClient {
  return {
    async listOpen(query, signal) {
      const program = requestHumanFollowUps(fetch, query).pipe(
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
          onLeft: (error): HumanFollowUpResult => ({ ok: false, error }),
          onRight: (page): HumanFollowUpResult => ({ ok: true, page }),
        });
      } catch {
        // RTK Query owns cancellation. Convert Effect interruption into data so
        // a rejected promise cannot escape queryFn's serializable contract.
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
  };
}

function requestHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: HumanFollowUpQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(inboxUrl(query), {
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

function inboxUrl(query: HumanFollowUpQuery) {
  const parameters = new URLSearchParams({ limit: String(query.limit) });
  if (query.queueKey !== undefined) {
    parameters.set('queueKey', query.queueKey);
  }
  if (query.cursor !== undefined) {
    parameters.set('afterOpenedAt', query.cursor.afterOpenedAt);
    parameters.set('afterWorkItemId', query.cursor.afterWorkItemId);
  }
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups?${parameters.toString()}`;
}

function decodeResponse(response: Response) {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(pageSchema)),
      Effect.map((page): HumanFollowUpPage => ({
        items: page.items,
        nextCursor: page.nextCursor,
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
  return readJson(response).pipe(
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
): HumanFollowUpFailure {
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
    status === 400 &&
    problem?.type === 'urn:ergon:problem:invalid-human-follow-up-queue'
  ) {
    return { kind: 'invalid-filter' };
  }
  if (
    status === 400 &&
    problem?.type === 'urn:ergon:problem:invalid-human-follow-up-page'
  ) {
    return { kind: 'invalid-page' };
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

function isRetryable(failure: HumanFollowUpFailure): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}
