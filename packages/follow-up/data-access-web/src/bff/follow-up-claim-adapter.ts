import type {
  ClaimHumanFollowUp,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClaimResult,
} from '../client';
import type { HumanFollowUpClaim } from '@ergon/follow-up-model';
import { Effect, Either, SynchronizedRef } from 'effect';

import {
  decodeCsrfToken,
  decodeHumanFollowUpClaim,
} from './follow-up-claim-codecs';
import {
  isRetryableClaimSetupFailure,
  mapAbortedTransportFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import type { BrowserCsrfToken } from './follow-up-wire-schemas';
import { claimUrl, CSRF_TOKEN_PATH } from './follow-up-urls';

interface FollowUpClaimAdapterOptions {
  /** Fetch-compatible transport for same-origin credentialed requests. */
  readonly fetch: typeof globalThis.fetch;
  /** Positive timeout in milliseconds applied to each outbound request. */
  readonly requestTimeout: number;
}

/**
 * Creates the claim operation with one synchronized, in-memory CSRF lifecycle.
 *
 * Concurrent claims share token acquisition. Setup transport and 503 failures
 * receive one retry, setup timeouts do not, and the claim POST is never replayed
 * automatically after an ambiguous result.
 */
export function createFollowUpClaimAdapter({
  fetch,
  requestTimeout,
}: FollowUpClaimAdapterOptions): ClaimHumanFollowUp {
  // SynchronizedRef owns no external resources; construction is synchronous
  // and infallible, so the adapter does not need a Scope or async factory.
  const csrfToken = Effect.runSync(
    SynchronizedRef.make<BrowserCsrfToken | undefined>(undefined),
  );

  return {
    async claim(command, signal): Promise<HumanFollowUpClaimResult> {
      const program = getCsrfToken(csrfToken, fetch, requestTimeout).pipe(
        Effect.flatMap((token) =>
          requestClaim(fetch, command, token).pipe(
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

      try {
        const result = await Effect.runPromise(Effect.either(program), {
          signal,
        });
        return Either.match(result, {
          onLeft: (error): HumanFollowUpClaimResult => ({
            ok: false,
            error: mapAbortedTransportFailure(signal, error),
          }),
          onRight: (claim): HumanFollowUpClaimResult => ({ ok: true, claim }),
        });
      } catch (cause) {
        if (!signal.aborted) {
          throw cause;
        }
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
  };
}

/**
 * Returns the cached token or performs one single-flight acquisition while the
 * synchronized reference is locked for competing claim calls.
 */
function getCsrfToken(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  fetch: typeof globalThis.fetch,
  requestTimeout: number,
): Effect.Effect<BrowserCsrfToken, HumanFollowUpClaimFailure, never> {
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
): Effect.Effect<BrowserCsrfToken, HumanFollowUpClaimFailure, never> {
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
    catch: (): HumanFollowUpClaimFailure => TRANSPORT_FAILURE,
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
          [csrfToken.headerName]: csrfToken.token,
        },
        credentials: 'same-origin',
        signal,
      }),
    catch: (): HumanFollowUpClaimFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeHumanFollowUpClaim));
}
