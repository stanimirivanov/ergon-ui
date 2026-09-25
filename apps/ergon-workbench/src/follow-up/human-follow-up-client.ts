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
const csrfTokenSchema = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.NonEmptyString,
});
const claimSchema = Schema.Struct({
  claimId: Schema.UUID,
  workItemId: Schema.UUID,
  claimedAt: utcInstant,
  recordedAt: utcInstant,
});
const ownedCursorSchema = Schema.Struct({
  afterClaimedAt: utcInstant,
  afterClaimId: Schema.UUID,
});
const ownedWorkSchema = Schema.Struct({
  workItem: workItemSchema,
  claim: claimSchema,
}).pipe(
  Schema.filter(
    ({ workItem, claim }) => workItem.workItemId === claim.workItemId,
  ),
);
const ownedPageSchema = Schema.Struct({
  items: Schema.Array(ownedWorkSchema),
  nextCursor: Schema.NullOr(ownedCursorSchema),
});
const resolutionContractSchema = Schema.Struct({
  key: Schema.NonEmptyString,
  revision: Schema.Number,
});
const caseObservationSchema = Schema.Struct({
  streamVersion: Schema.Number,
  eventType: Schema.NonEmptyString,
  summary: Schema.NonEmptyString,
  observationId: Schema.UUID,
  originType: Schema.NonEmptyString,
  provider: Schema.NonEmptyString,
  reference: Schema.NullOr(Schema.NonEmptyString),
  content: Schema.NonEmptyString,
  occurredAt: utcInstant,
  recordedAt: utcInstant,
});
const resolverFollowUpCaseSummarySchema = Schema.Struct({
  followUp: Schema.Struct({
    workItemId: Schema.UUID,
    queueKey,
    escalationReason: Schema.NonEmptyString,
    openedAt: utcInstant,
    claimedAt: utcInstant,
  }),
  case: Schema.Struct({
    caseId: Schema.UUID,
    goal: Schema.NonEmptyString,
    status: Schema.Literal('OPEN'),
    streamVersion: Schema.Number,
    resolutionContract: Schema.NullOr(resolutionContractSchema),
  }),
  observations: Schema.Array(caseObservationSchema),
  resolutionRun: Schema.Struct({
    runId: Schema.UUID,
    caseEvidenceStreamVersion: Schema.Number,
    contractKey: Schema.NonEmptyString,
    contractRevision: Schema.Number,
    policyRevision: Schema.NonEmptyString,
    stepId: Schema.NonEmptyString,
    capability: Schema.NonEmptyString,
    effectiveRisk: Schema.Literal('LOW', 'MEDIUM', 'HIGH'),
    requiredApproval: Schema.NonEmptyString,
    attemptNumber: Schema.Number,
    predecessorRunId: Schema.NullOr(Schema.UUID),
    state: Schema.Literal('ESCALATED'),
    stateVersion: Schema.Number,
    stateUpdatedAt: utcInstant,
    recordedAt: utcInstant,
  }),
});
const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  signInPath: Schema.optional(Schema.String),
});

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;
const CSRF_TOKEN_PATH = '/bff/v1/csrf' as const;

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

/** Idempotent ownership request for one tenant-scoped follow-up item. */
export interface HumanFollowUpClaimCommand {
  readonly tenantId: string;
  readonly workItemId: string;
}

export interface HumanFollowUpClaim {
  readonly claimId: string;
  readonly workItemId: string;
  readonly claimedAt: string;
  readonly recordedAt: string;
}

/** Exact oldest-claim-first position; both values must travel together. */
export interface ResolverOwnedHumanFollowUpCursor {
  readonly afterClaimedAt: string;
  readonly afterClaimId: string;
}

export interface ResolverOwnedHumanFollowUpWork {
  readonly workItem: HumanFollowUpWorkItem;
  readonly claim: HumanFollowUpClaim;
}

export interface ResolverOwnedHumanFollowUpPage {
  readonly items: readonly ResolverOwnedHumanFollowUpWork[];
  readonly nextCursor: ResolverOwnedHumanFollowUpCursor | null;
}

/** Bounded active-work request scoped to the current tenant actor. */
export interface ResolverOwnedHumanFollowUpQuery {
  readonly tenantId: string;
  readonly limit: number;
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
}

/** Identifies one owned follow-up whose server-authorized context is requested. */
export interface ResolverFollowUpCaseSummaryQuery {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
}

export interface ResolverFollowUpCaseSummary {
  readonly followUp: {
    readonly workItemId: string;
    readonly queueKey: string;
    readonly escalationReason: string;
    readonly openedAt: string;
    readonly claimedAt: string;
  };
  readonly case: {
    readonly caseId: string;
    readonly goal: string;
    readonly status: 'OPEN';
    readonly streamVersion: number;
    readonly resolutionContract: {
      readonly key: string;
      readonly revision: number;
    };
  };
  readonly observations: readonly {
    readonly streamVersion: number;
    readonly eventType: string;
    readonly summary: string;
    readonly observationId: string;
    readonly originType: string;
    readonly provider: string;
    readonly reference: string | null;
    readonly content: string;
    readonly occurredAt: string;
    readonly recordedAt: string;
  }[];
  readonly resolutionRun: {
    readonly runId: string;
    readonly caseEvidenceStreamVersion: number;
    readonly contractKey: string;
    readonly contractRevision: number;
    readonly policyRevision: string;
    readonly stepId: string;
    readonly capability: string;
    readonly effectiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    readonly requiredApproval: string;
    readonly attemptNumber: number;
    readonly predecessorRunId: string | null;
    readonly state: 'ESCALATED';
    readonly stateVersion: number;
    readonly stateUpdatedAt: string;
    readonly recordedAt: string;
  };
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

export type ResolverOwnedHumanFollowUpResult =
  | { readonly ok: true; readonly page: ResolverOwnedHumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

export type ResolverFollowUpCaseSummaryFailure =
  HumanFollowUpFailure | { readonly kind: 'not-found' };

export type ResolverFollowUpCaseSummaryResult =
  | { readonly ok: true; readonly summary: ResolverFollowUpCaseSummary }
  | { readonly ok: false; readonly error: ResolverFollowUpCaseSummaryFailure };

export type HumanFollowUpClaimFailure =
  | {
      readonly kind: 'authentication-required';
      readonly signInPath: typeof BROWSER_SIGN_IN_PATH;
    }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'resolver-authority-required' }
  | { readonly kind: 'csrf-rejected' }
  | { readonly kind: 'already-claimed' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'request-cancelled' };

export type HumanFollowUpClaimResult =
  | { readonly ok: true; readonly claim: HumanFollowUpClaim }
  | { readonly ok: false; readonly error: HumanFollowUpClaimFailure };

/**
 * Same-origin browser boundary for visible, owned, and claimable follow-up work.
 *
 * Implementations must decode responses before returning them and keep CSRF
 * state out of callers. Claim failures are not automatically replayed because
 * the resolver must be told when the result is ambiguous.
 */
export interface HumanFollowUpClient {
  listOpen(
    query: HumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<HumanFollowUpResult>;

  listOwned(
    query: ResolverOwnedHumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<ResolverOwnedHumanFollowUpResult>;

  getOwnedCaseSummary(
    query: ResolverFollowUpCaseSummaryQuery,
    signal: AbortSignal,
  ): Promise<ResolverFollowUpCaseSummaryResult>;

  claim(
    command: HumanFollowUpClaimCommand,
    signal: AbortSignal,
  ): Promise<HumanFollowUpClaimResult>;
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
const SUMMARY_INVALID_RESPONSE: ResolverFollowUpCaseSummaryFailure = {
  kind: 'invalid-response',
};
const SUMMARY_REQUEST_CANCELLED: ResolverFollowUpCaseSummaryFailure = {
  kind: 'request-cancelled',
};
const CLAIM_TRANSPORT_FAILURE: HumanFollowUpClaimFailure = {
  kind: 'transport',
};
const CLAIM_INVALID_RESPONSE: HumanFollowUpClaimFailure = {
  kind: 'invalid-response',
};
const CLAIM_REQUEST_CANCELLED: HumanFollowUpClaimFailure = {
  kind: 'request-cancelled',
};

interface BrowserCsrfToken {
  readonly headerName: 'X-CSRF-TOKEN';
  readonly token: string;
}

/**
 * Creates the HTTP boundary for the shared inbox and idempotent claim command.
 *
 * The client validates the complete browser DTO before returning it, retains
 * both keyset values as one cursor, and retries only transient reads. The CSRF
 * value remains in this client closure and is discarded after rejection. Its
 * serializable results are safe for RTK Query and exclude identity-provider
 * data, credentials, and authority evidence.
 */
export function createHumanFollowUpClient({
  fetch,
  requestTimeout = 5_000,
}: HumanFollowUpClientOptions): HumanFollowUpClient {
  let csrfToken: BrowserCsrfToken | undefined;

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
    async listOwned(query, signal) {
      const program = requestResolverOwnedHumanFollowUps(fetch, query).pipe(
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
          onLeft: (error): ResolverOwnedHumanFollowUpResult => ({
            ok: false,
            error,
          }),
          onRight: (page): ResolverOwnedHumanFollowUpResult => ({
            ok: true,
            page,
          }),
        });
      } catch {
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
    async getOwnedCaseSummary(query, signal) {
      const program = requestResolverFollowUpCaseSummary(fetch, query).pipe(
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
          onLeft: (error): ResolverFollowUpCaseSummaryResult => ({
            ok: false,
            error,
          }),
          onRight: (summary): ResolverFollowUpCaseSummaryResult => ({
            ok: true,
            summary,
          }),
        });
      } catch {
        return { ok: false, error: SUMMARY_REQUEST_CANCELLED };
      }
    },
    async claim(command, signal) {
      const tokenProgram =
        csrfToken === undefined
          ? requestCsrfToken(fetch).pipe(
              Effect.retry({ times: 1, while: isClaimSetupRetryable }),
              Effect.tap((token) =>
                Effect.sync(() => {
                  csrfToken = token;
                }),
              ),
            )
          : Effect.succeed(csrfToken);
      const program = tokenProgram.pipe(
        Effect.flatMap((token) => requestClaim(fetch, command, token)),
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => ({ kind: 'timeout' }) as const,
        }),
      );

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        if (Either.isLeft(result) && result.left.kind === 'csrf-rejected') {
          csrfToken = undefined;
        }
        return Either.match(result, {
          onLeft: (error): HumanFollowUpClaimResult => ({
            ok: false,
            error,
          }),
          onRight: (claim): HumanFollowUpClaimResult => ({ ok: true, claim }),
        });
      } catch {
        return { ok: false, error: CLAIM_REQUEST_CANCELLED };
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

function requestResolverOwnedHumanFollowUps(
  fetch: typeof globalThis.fetch,
  query: ResolverOwnedHumanFollowUpQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(ownedWorkUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeOwnedResponse));
}

function requestResolverFollowUpCaseSummary(
  fetch: typeof globalThis.fetch,
  query: ResolverFollowUpCaseSummaryQuery,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(caseSummaryUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => TRANSPORT_FAILURE,
  }).pipe(
    Effect.flatMap((response) => decodeCaseSummaryResponse(response, query)),
  );
}

function requestCsrfToken(fetch: typeof globalThis.fetch) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(CSRF_TOKEN_PATH, {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => CLAIM_TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeCsrfResponse));
}

function requestClaim(
  fetch: typeof globalThis.fetch,
  command: HumanFollowUpClaimCommand,
  csrfToken: BrowserCsrfToken,
) {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(claimUrl(command), {
        method: 'POST',
        headers: {
          Accept: 'application/json, application/problem+json',
          [csrfToken.headerName]: csrfToken.token,
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: () => CLAIM_TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeClaimResponse));
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

function claimUrl(command: HumanFollowUpClaimCommand) {
  return `/bff/v1/tenants/${encodeURIComponent(command.tenantId)}/human-follow-ups/${encodeURIComponent(command.workItemId)}/claims`;
}

function ownedWorkUrl(query: ResolverOwnedHumanFollowUpQuery) {
  const parameters = new URLSearchParams({ limit: String(query.limit) });
  if (query.cursor !== undefined) {
    parameters.set('afterClaimedAt', query.cursor.afterClaimedAt);
    parameters.set('afterClaimId', query.cursor.afterClaimId);
  }
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/owned?${parameters.toString()}`;
}

function caseSummaryUrl(query: ResolverFollowUpCaseSummaryQuery) {
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/case-summary`;
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

function decodeOwnedResponse(response: Response) {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(ownedPageSchema)),
      Effect.map((page): ResolverOwnedHumanFollowUpPage => ({
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

function decodeCaseSummaryResponse(
  response: Response,
  query: ResolverFollowUpCaseSummaryQuery,
) {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(resolverFollowUpCaseSummarySchema)),
      Effect.flatMap((summary) =>
        isValidCaseSummary(summary, query)
          ? Effect.succeed(summary as ResolverFollowUpCaseSummary)
          : Effect.fail(SUMMARY_INVALID_RESPONSE),
      ),
      Effect.mapError(() => SUMMARY_INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapCaseSummaryHttpFailure(response.status, problem)),
    ),
  );
}

function decodeCsrfResponse(response: Response) {
  if (response.status === 200) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(csrfTokenSchema)),
      Effect.map((token): BrowserCsrfToken => token),
      Effect.mapError(() => CLAIM_INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapClaimHttpFailure(response.status, problem)),
    ),
  );
}

function decodeClaimResponse(response: Response) {
  if (response.status === 200 || response.status === 201) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(claimSchema)),
      Effect.map((claim): HumanFollowUpClaim => claim),
      Effect.mapError(() => CLAIM_INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapClaimHttpFailure(response.status, problem)),
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
    (problem?.type === 'urn:ergon:problem:invalid-human-follow-up-page' ||
      problem?.type ===
        'urn:ergon:problem:invalid-resolver-owned-human-follow-up-page')
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

function mapClaimHttpFailure(
  status: number,
  problem?: {
    readonly type: string;
    readonly signInPath?: string | undefined;
  },
): HumanFollowUpClaimFailure {
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
    problem?.type === 'urn:ergon:problem:invalid-browser-csrf-token'
  ) {
    return { kind: 'csrf-rejected' };
  }
  if (
    status === 403 &&
    problem?.type ===
      'urn:ergon:problem:human-follow-up-resolver-authority-required'
  ) {
    return { kind: 'resolver-authority-required' };
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
  if (
    status === 409 &&
    problem?.type === 'urn:ergon:problem:human-follow-up-already-claimed'
  ) {
    return { kind: 'already-claimed' };
  }
  if (
    status === 404 &&
    problem?.type === 'urn:ergon:problem:human-follow-up-work-item-not-found'
  ) {
    return { kind: 'not-found' };
  }
  if (
    status === 503 &&
    problem?.type === 'urn:ergon:problem:browser-authentication-unavailable'
  ) {
    return { kind: 'authentication-unavailable' };
  }
  if (status === 403) {
    return { kind: 'forbidden' };
  }
  if (status >= 500) {
    return { kind: 'service-unavailable', status };
  }
  return { kind: 'unexpected-response', status };
}

function mapCaseSummaryHttpFailure(
  status: number,
  problem?: {
    readonly type: string;
    readonly signInPath?: string | undefined;
  },
): ResolverFollowUpCaseSummaryFailure {
  if (
    status === 404 &&
    problem?.type ===
      'urn:ergon:problem:resolver-follow-up-case-summary-not-found'
  ) {
    return { kind: 'not-found' };
  }
  return mapHttpFailure(status, problem);
}

function isValidCaseSummary(
  summary: Schema.Schema.Type<typeof resolverFollowUpCaseSummarySchema>,
  query: ResolverFollowUpCaseSummaryQuery,
): boolean {
  const contract = summary.case.resolutionContract;
  const versions = [
    summary.case.streamVersion,
    summary.resolutionRun.caseEvidenceStreamVersion,
    summary.resolutionRun.contractRevision,
    summary.resolutionRun.attemptNumber,
    summary.resolutionRun.stateVersion,
    ...summary.observations.map((observation) => observation.streamVersion),
  ];

  return (
    summary.followUp.workItemId === query.workItemId &&
    summary.case.caseId === query.caseId &&
    summary.resolutionRun.runId === query.runId &&
    contract !== null &&
    contract.key === summary.resolutionRun.contractKey &&
    contract.revision === summary.resolutionRun.contractRevision &&
    summary.resolutionRun.caseEvidenceStreamVersion <=
      summary.case.streamVersion &&
    versions.every(isPositiveInteger) &&
    summary.observations.every(
      (observation, index, observations) =>
        observation.streamVersion <= summary.case.streamVersion &&
        (index === 0 ||
          observations[index - 1]!.streamVersion < observation.streamVersion),
    )
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isRetryable(
  failure: HumanFollowUpFailure | ResolverFollowUpCaseSummaryFailure,
): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}

function isClaimSetupRetryable(failure: HumanFollowUpClaimFailure): boolean {
  return failure.kind === 'transport' || failure.kind === 'service-unavailable';
}
