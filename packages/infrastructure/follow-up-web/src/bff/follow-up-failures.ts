import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  ResolverFollowUpCaseSummaryFailure,
} from '../client';

import type { ProblemDetail } from './follow-up-wire-schemas';

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;

type SharedProblemFailure = Extract<
  HumanFollowUpFailure,
  {
    readonly kind:
      | 'authentication-required'
      | 'authentication-unavailable'
      | 'actor-not-registered'
      | 'identity-rejected';
  }
>;
type SharedStatusFailure = Extract<
  HumanFollowUpFailure,
  {
    readonly kind: 'forbidden' | 'service-unavailable' | 'unexpected-response';
  }
>;
type ProblemFailureFactory<Failure> = () => Failure;
type StatusFailureFactory = (status: number) => SharedStatusFailure;

/**
 * Transport failed before a trusted HTTP response was available. The raw
 * browser cause is omitted to keep application state serializable and private.
 */
export const TRANSPORT_FAILURE = { kind: 'transport' } as const;

/** The HTTP response could not be decoded into its required wire contract. */
export const INVALID_RESPONSE = { kind: 'invalid-response' } as const;

/** The caller ended an in-flight operation through its abort signal. */
export const REQUEST_CANCELLED = { kind: 'request-cancelled' } as const;

/** One configured outbound request attempt exceeded its deadline. */
export const TIMEOUT_FAILURE = { kind: 'timeout' } as const;

const SHARED_PROBLEM_FAILURES: ReadonlyMap<
  string,
  ProblemFailureFactory<SharedProblemFailure>
> = new Map<string, ProblemFailureFactory<SharedProblemFailure>>([
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

const READ_PROBLEM_FAILURES: ReadonlyMap<
  string,
  ProblemFailureFactory<HumanFollowUpFailure>
> = new Map<string, ProblemFailureFactory<HumanFollowUpFailure>>([
  ...SHARED_PROBLEM_FAILURES,
  [
    problemKey(400, 'urn:ergon:problem:invalid-human-follow-up-queue'),
    () => ({ kind: 'invalid-filter' }),
  ],
  [
    problemKey(400, 'urn:ergon:problem:invalid-human-follow-up-page'),
    () => ({ kind: 'invalid-page' }),
  ],
  [
    problemKey(
      400,
      'urn:ergon:problem:invalid-resolver-owned-human-follow-up-page',
    ),
    () => ({ kind: 'invalid-page' }),
  ],
]);

const CLAIM_PROBLEM_FAILURES: ReadonlyMap<
  string,
  ProblemFailureFactory<HumanFollowUpClaimFailure>
> = new Map<string, ProblemFailureFactory<HumanFollowUpClaimFailure>>([
  ...SHARED_PROBLEM_FAILURES,
  [
    problemKey(403, 'urn:ergon:problem:invalid-browser-csrf-token'),
    () => ({ kind: 'csrf-rejected' }),
  ],
  [
    problemKey(
      403,
      'urn:ergon:problem:human-follow-up-resolver-authority-required',
    ),
    () => ({ kind: 'resolver-authority-required' }),
  ],
  [
    problemKey(409, 'urn:ergon:problem:human-follow-up-already-claimed'),
    () => ({ kind: 'already-claimed' }),
  ],
  [
    problemKey(404, 'urn:ergon:problem:human-follow-up-work-item-not-found'),
    () => ({ kind: 'not-found' }),
  ],
]);

const CASE_SUMMARY_PROBLEM_FAILURES: ReadonlyMap<
  string,
  ProblemFailureFactory<ResolverFollowUpCaseSummaryFailure>
> = new Map<string, ProblemFailureFactory<ResolverFollowUpCaseSummaryFailure>>([
  [
    problemKey(
      404,
      'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
    ),
    () => ({ kind: 'not-found' }),
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

/**
 * Gives caller cancellation precedence when fetch rejection races Effect
 * interruption.
 *
 * Only a transport failure is rewritten; decoded HTTP and domain failures keep
 * their original meaning even if the signal is subsequently aborted.
 */
export function mapAbortedTransportFailure<
  Failure extends { readonly kind: string },
>(signal: AbortSignal, failure: Failure): Failure | typeof REQUEST_CANCELLED {
  // Fetch may reject with AbortError before Effect observes the caller's
  // interruption. The caller's signal is authoritative in that race.
  return signal.aborted && failure.kind === 'transport'
    ? REQUEST_CANCELLED
    : failure;
}

/** Maps a read response status and trusted problem identity to its application failure. */
export function mapReadHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpFailure {
  return (
    lookupProblemFailure(READ_PROBLEM_FAILURES, status, problem) ??
    mapStatusFailure(status)
  );
}

/** Maps a claim response status and trusted problem identity to its application failure. */
export function mapClaimHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpClaimFailure {
  return (
    lookupProblemFailure(CLAIM_PROBLEM_FAILURES, status, problem) ??
    mapStatusFailure(status)
  );
}

/**
 * Maps case-summary absence before delegating shared read failures.
 * `not-found` preserves the browser contract's non-disclosure semantics.
 */
export function mapCaseSummaryHttpFailure(
  status: number,
  problem?: ProblemDetail,
): ResolverFollowUpCaseSummaryFailure {
  return (
    lookupProblemFailure(CASE_SUMMARY_PROBLEM_FAILURES, status, problem) ??
    mapReadHttpFailure(status, problem)
  );
}

/**
 * Resolves an exact status/problem tuple and creates a fresh failure value so
 * one consumer cannot mutate a value retained by the lookup table.
 */
function lookupProblemFailure<Failure>(
  failures: ReadonlyMap<string, ProblemFailureFactory<Failure>>,
  status: number,
  problem?: ProblemDetail,
): Failure | undefined {
  const factory =
    problem === undefined
      ? undefined
      : failures.get(problemKey(status, problem.type, problem.signInPath));
  return factory?.();
}

/**
 * Builds a collision-safe problem identity. The advertised sign-in path is
 * part of the key so an untrusted problem cannot redirect to an arbitrary path.
 */
function problemKey(status: number, type: string, signInPath?: string): string {
  return JSON.stringify([status, type, signInPath ?? null]);
}

/** Applies exact-status, status-class, then unexpected-response fallback policy. */
function mapStatusFailure(status: number): SharedStatusFailure {
  const factory =
    STATUS_FAILURES.get(status) ??
    STATUS_CLASS_FAILURES.get(Math.trunc(status / 100)) ??
    unexpectedResponse;
  return factory(status);
}

/**
 * Selects failures safe to retry for idempotent reads: transport, timeout, and
 * server unavailability.
 */
export function isRetryableReadFailure(
  failure: HumanFollowUpFailure | ResolverFollowUpCaseSummaryFailure,
): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}

/**
 * Selects failures safe to retry while acquiring CSRF state.
 * Timeouts are deliberately excluded to keep claim setup latency bounded.
 */
export function isRetryableClaimSetupFailure(
  failure: HumanFollowUpClaimFailure,
): boolean {
  return failure.kind === 'transport' || failure.kind === 'service-unavailable';
}
