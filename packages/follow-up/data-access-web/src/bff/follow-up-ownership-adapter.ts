import type {
  ClaimHumanFollowUp,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClaimResult,
  HumanFollowUpCommandFailure,
  HumanFollowUpReleaseCommand,
  HumanFollowUpReleaseFailure,
  HumanFollowUpReleaseResult,
  ReleaseHumanFollowUp,
} from '../client';
import type {
  HumanFollowUpClaim,
  HumanFollowUpRelease,
} from '@ergon/follow-up-model';
import { Effect, Either, SynchronizedRef } from 'effect';

import {
  decodeCsrfToken,
  decodeHumanFollowUpClaim,
} from './follow-up-claim-codecs';
import { decodeHumanFollowUpRelease } from './follow-up-release-codecs';
import {
  isRetryableClaimSetupFailure,
  mapAbortedTransportFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import type { BrowserCsrfToken } from './follow-up-wire-schemas';
import { claimUrl, CSRF_TOKEN_PATH, releaseUrl } from './follow-up-urls';

interface FollowUpOwnershipAdapterOptions {
  /** Fetch-compatible transport for same-origin credentialed requests. */
  readonly fetch: typeof globalThis.fetch;
  /** Positive timeout in milliseconds applied to each outbound request. */
  readonly requestTimeout: number;
}

/**
 * Creates claim and release operations with one in-memory CSRF lifecycle.
 *
 * Concurrent claims share token acquisition. Setup transport and 503 failures
 * receive one retry, setup timeouts do not, and the claim POST is never replayed
 * automatically after an ambiguous result. Exact release replay uses the
 * original claim ID and expected revision; no command state is persisted.
 */
export function createFollowUpOwnershipAdapter({
  fetch,
  requestTimeout,
}: FollowUpOwnershipAdapterOptions): ClaimHumanFollowUp & ReleaseHumanFollowUp {
  // SynchronizedRef owns no external resources; construction is synchronous
  // and infallible, so the adapter does not need a Scope or async factory.
  const csrfToken = Effect.runSync(
    SynchronizedRef.make<BrowserCsrfToken | undefined>(undefined),
  );

  return {
    async claim(command, signal): Promise<HumanFollowUpClaimResult> {
      const result = await runCommand(
        withCsrfToken(csrfToken, fetch, requestTimeout, (token) =>
          requestClaim(fetch, command, token),
        ),
        signal,
      );
      return result.ok
        ? { ok: true, claim: result.value }
        : { ok: false, error: result.error };
    },
    async release(command, signal): Promise<HumanFollowUpReleaseResult> {
      const result = await runCommand(
        withCsrfToken(csrfToken, fetch, requestTimeout, (token) =>
          requestRelease(fetch, command, token),
        ),
        signal,
      );
      return result.ok
        ? { ok: true, release: result.value }
        : { ok: false, error: result.error };
    },
  };
}

/** Applies shared CSRF acquisition and per-request timeout to one mutation. */
function withCsrfToken<A, E extends { readonly kind: string }>(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  fetch: typeof globalThis.fetch,
  requestTimeout: number,
  request: (token: BrowserCsrfToken) => Effect.Effect<A, E, never>,
): Effect.Effect<A, E | HumanFollowUpCommandFailure, never> {
  return getCsrfToken(csrfToken, fetch, requestTimeout).pipe(
    Effect.flatMap((token) =>
      request(token).pipe(
        Effect.timeoutFail({
          duration: requestTimeout,
          onTimeout: () => TIMEOUT_FAILURE,
        }),
        Effect.tapError((error) =>
          error.kind === 'csrf-rejected'
            ? invalidateRejectedToken(csrfToken, token)
            : Effect.void,
        ),
      ),
    ),
  );
}

type CommandExecution<A, E> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly error: E | typeof REQUEST_CANCELLED };

/** Converts Effect interruption and AbortError races into a typed outcome. */
async function runCommand<A, E extends { readonly kind: string }>(
  program: Effect.Effect<A, E, never>,
  signal: AbortSignal,
): Promise<CommandExecution<A, E>> {
  try {
    const result = await Effect.runPromise(Effect.either(program), { signal });
    return Either.match(result, {
      onLeft: (error): CommandExecution<A, E> => ({
        ok: false,
        error: mapAbortedTransportFailure(signal, error),
      }),
      onRight: (value): CommandExecution<A, E> => ({ ok: true, value }),
    });
  } catch (cause) {
    if (!signal.aborted) {
      throw cause;
    }
    return { ok: false, error: REQUEST_CANCELLED };
  }
}

/**
 * Returns the cached token or performs one single-flight acquisition while the
 * synchronized reference is locked for competing claim calls.
 */
function getCsrfToken(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  fetch: typeof globalThis.fetch,
  requestTimeout: number,
): Effect.Effect<BrowserCsrfToken, HumanFollowUpCommandFailure, never> {
  return SynchronizedRef.modifyEffect(csrfToken, (cachedToken) => {
    if (cachedToken !== undefined) {
      return Effect.succeed([cachedToken, cachedToken] as const);
    }

    return requestCsrfToken(fetch).pipe(
      Effect.timeoutFail({
        duration: requestTimeout,
        onTimeout: () => TIMEOUT_FAILURE,
      }),
      // A timeout is not retried: only transport and classified 503 failures
      // receive the single safe setup retry, keeping claim latency bounded.
      Effect.retry({ times: 1, while: isRetryableClaimSetupFailure }),
      Effect.map((freshToken) => [freshToken, freshToken] as const),
    );
  });
}

/** Clears a rejected token only if no concurrent acquisition has replaced it. */
function invalidateRejectedToken(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  rejectedToken: BrowserCsrfToken,
): Effect.Effect<void, never, never> {
  return SynchronizedRef.update(csrfToken, (cachedToken) =>
    cachedToken?.headerName === rejectedToken.headerName &&
    cachedToken.token === rejectedToken.token
      ? undefined
      : cachedToken,
  );
}

/** Constructs the interruptible same-origin CSRF acquisition request. */
function requestCsrfToken(
  fetch: typeof globalThis.fetch,
): Effect.Effect<BrowserCsrfToken, HumanFollowUpCommandFailure, never> {
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
    catch: (): HumanFollowUpCommandFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeCsrfToken));
}

/**
 * Constructs one interruptible claim attempt with the server-approved CSRF
 * header. Retry remains an explicit caller decision.
 */
function requestClaim(
  fetch: typeof globalThis.fetch,
  command: HumanFollowUpClaimCommand,
  csrfToken: BrowserCsrfToken,
): Effect.Effect<HumanFollowUpClaim, HumanFollowUpClaimFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(claimUrl(command), {
        method: 'POST',
        headers: {
          Accept: 'application/json, application/problem+json',
          'Content-Type': 'application/json',
          [csrfToken.headerName]: csrfToken.token,
        },
        credentials: 'same-origin',
        signal,
        body: JSON.stringify({
          commandId: command.commandId,
          expectedOwnershipRevision: command.expectedOwnershipRevision,
        }),
      }),
    catch: (): HumanFollowUpClaimFailure => TRANSPORT_FAILURE,
  }).pipe(
    Effect.flatMap((response) => decodeHumanFollowUpClaim(response, command)),
  );
}

/** Constructs one exact-claim release attempt without automatic replay. */
function requestRelease(
  fetch: typeof globalThis.fetch,
  command: HumanFollowUpReleaseCommand,
  csrfToken: BrowserCsrfToken,
): Effect.Effect<HumanFollowUpRelease, HumanFollowUpReleaseFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(releaseUrl(command), {
        method: 'POST',
        headers: {
          Accept: 'application/json, application/problem+json',
          'Content-Type': 'application/json',
          [csrfToken.headerName]: csrfToken.token,
        },
        credentials: 'same-origin',
        signal,
        body: JSON.stringify({
          expectedOwnershipRevision: command.expectedOwnershipRevision,
        }),
      }),
    catch: (): HumanFollowUpReleaseFailure => TRANSPORT_FAILURE,
  }).pipe(
    Effect.flatMap((response) => decodeHumanFollowUpRelease(response, command)),
  );
}
