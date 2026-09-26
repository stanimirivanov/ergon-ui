import type {
  ClaimHumanFollowUp,
  HumanFollowUpClaimCommand,
  HumanFollowUpClaimFailure,
  HumanFollowUpClaimResult,
} from '@ergon/application-follow-up';
import { Effect, Either } from 'effect';

import {
  decodeCsrfToken,
  decodeHumanFollowUpClaim,
} from './follow-up-claim-codecs';
import {
  isRetryableClaimSetupFailure,
  REQUEST_CANCELLED,
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
  let csrfToken: BrowserCsrfToken | undefined;

  return {
    async claim(command, signal) {
      const tokenProgram =
        csrfToken === undefined
          ? requestCsrfToken(fetch).pipe(
              Effect.retry({
                times: 1,
                while: isRetryableClaimSetupFailure,
              }),
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
      } catch (cause) {
        if (!signal.aborted) {
          throw cause;
        }
        return { ok: false, error: REQUEST_CANCELLED };
      }
    },
  };
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
