import type {
  ClaimHumanFollowUp,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClaimResult,
} from '@ergon/application-follow-up';
import { Effect, Either, SynchronizedRef } from 'effect';

import {
  decodeCsrfToken,
  decodeHumanFollowUpClaim,
} from './follow-up-claim-codecs';
import {
  isRetryableClaimSetupFailure,
  REQUEST_CANCELLED,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from './follow-up-failures';
import type { BrowserCsrfToken } from './follow-up-wire-schemas';
import { claimUrl, CSRF_TOKEN_PATH } from './follow-up-urls';

interface FollowUpClaimAdapterOptions {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout: number;
}

export function createFollowUpClaimAdapter({
  fetch,
  requestTimeout,
}: FollowUpClaimAdapterOptions): ClaimHumanFollowUp {
  const csrfToken = Effect.runSync(
    SynchronizedRef.make<BrowserCsrfToken | undefined>(undefined),
  );

  return {
    async claim(command, signal) {
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
          onLeft: (error): HumanFollowUpClaimResult => ({ ok: false, error }),
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

function getCsrfToken(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  fetch: typeof globalThis.fetch,
  requestTimeout: number,
) {
  return SynchronizedRef.modifyEffect(csrfToken, (cachedToken) => {
    if (cachedToken !== undefined) {
      return Effect.succeed([cachedToken, cachedToken] as const);
    }

    return requestCsrfToken(fetch).pipe(
      Effect.timeoutFail({
        duration: requestTimeout,
        onTimeout: () => TIMEOUT_FAILURE,
      }),
      Effect.retry({ times: 1, while: isRetryableClaimSetupFailure }),
      Effect.map((freshToken) => [freshToken, freshToken] as const),
    );
  });
}

function invalidateRejectedToken(
  csrfToken: SynchronizedRef.SynchronizedRef<BrowserCsrfToken | undefined>,
  rejectedToken: BrowserCsrfToken,
) {
  return SynchronizedRef.update(csrfToken, (cachedToken) =>
    cachedToken?.headerName === rejectedToken.headerName &&
    cachedToken.token === rejectedToken.token
      ? undefined
      : cachedToken,
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
    catch: (): HumanFollowUpClaimFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeCsrfToken));
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
    catch: (): HumanFollowUpClaimFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap(decodeHumanFollowUpClaim));
}
