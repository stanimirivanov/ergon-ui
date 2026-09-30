import type { CurrentActorFailure } from '../current-actor-client';
import type { ProblemDetail } from './current-actor-wire-schemas';

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;

type ExactProblemFailure = Extract<
  CurrentActorFailure,
  {
    readonly kind:
      | 'authentication-required'
      | 'authentication-unavailable'
      | 'actor-not-registered'
      | 'identity-rejected';
  }
>;
type StatusFailure = Extract<
  CurrentActorFailure,
  {
    readonly kind: 'forbidden' | 'service-unavailable' | 'unexpected-response';
  }
>;
type ProblemFailureFactory = () => ExactProblemFailure;
type StatusFailureFactory = (status: number) => StatusFailure;

/** Transport failed before a trusted HTTP response was available. */
export const TRANSPORT_FAILURE = { kind: 'transport' } as const;

/** The HTTP response did not satisfy the required wire contract. */
export const INVALID_RESPONSE = { kind: 'invalid-response' } as const;

/** The caller ended an in-flight resolution through its abort signal. */
export const REQUEST_CANCELLED = { kind: 'request-cancelled' } as const;

/** One configured session-read attempt exceeded its deadline. */
export const TIMEOUT_FAILURE = { kind: 'timeout' } as const;

const EXACT_PROBLEM_FAILURES: ReadonlyMap<string, ProblemFailureFactory> =
  new Map<string, ProblemFailureFactory>([
    [
      problemKey(
        401,
        'urn:ergon:problem:browser-authentication-required',
        BROWSER_SIGN_IN_PATH,
      ),
      () => ({ kind: 'authentication-required' }),
    ],
    [
      problemKey(403, 'urn:ergon:problem:human-actor-not-registered'),
      () => ({ kind: 'actor-not-registered' }),
    ],
    [
      problemKey(403, 'urn:ergon:problem:untrusted-human-identity-issuer'),
      () => ({ kind: 'identity-rejected' }),
    ],
    [
      problemKey(403, 'urn:ergon:problem:invalid-authenticated-human-identity'),
      () => ({ kind: 'identity-rejected' }),
    ],
    [
      problemKey(503, 'urn:ergon:problem:browser-authentication-unavailable'),
      () => ({ kind: 'authentication-unavailable' }),
    ],
  ]);

const STATUS_FAILURES: ReadonlyMap<number, StatusFailureFactory> = new Map([
  [403, () => ({ kind: 'forbidden' })],
]);
const STATUS_CLASS_FAILURES: ReadonlyMap<number, StatusFailureFactory> =
  new Map([[5, (status) => ({ kind: 'service-unavailable', status })]]);
const unexpectedResponse: StatusFailureFactory = (status) => ({
  kind: 'unexpected-response',
  status,
});

/** Maps trusted HTTP status and problem identity to a presentation-safe failure. */
export function mapCurrentActorHttpFailure(
  status: number,
  problem?: ProblemDetail,
): CurrentActorFailure {
  const exactFailure =
    problem === undefined
      ? undefined
      : EXACT_PROBLEM_FAILURES.get(
          problemKey(status, problem.type, problem.signInPath),
        )?.();

  return exactFailure ?? mapStatusFailure(status);
}

/**
 * Gives caller cancellation precedence when fetch rejection races Effect
 * interruption without rewriting trusted HTTP failures.
 */
export function mapAbortedTransportFailure(
  signal: AbortSignal,
  failure: CurrentActorFailure,
): CurrentActorFailure {
  return signal.aborted && failure.kind === 'transport'
    ? REQUEST_CANCELLED
    : failure;
}

/** Selects the transient failures safe to retry for the idempotent session read. */
export function isRetryableCurrentActorFailure(
  failure: CurrentActorFailure,
): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}

/**
 * Includes the advertised sign-in path in the exact problem identity so a
 * problem response cannot direct the browser to an arbitrary location.
 */
function problemKey(status: number, type: string, signInPath?: string): string {
  return JSON.stringify([status, type, signInPath ?? null]);
}

function mapStatusFailure(status: number): StatusFailure {
  const factory =
    STATUS_FAILURES.get(status) ??
    STATUS_CLASS_FAILURES.get(Math.trunc(status / 100)) ??
    unexpectedResponse;
  return factory(status);
}
