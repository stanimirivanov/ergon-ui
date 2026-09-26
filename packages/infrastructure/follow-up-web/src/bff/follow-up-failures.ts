import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  ResolverFollowUpCaseSummaryFailure,
} from '@ergon/application-follow-up';

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

// Application failures remain serializable and do not disclose browser or
// network internals to Redux state, logs, or presentation code.
export const TRANSPORT_FAILURE = { kind: 'transport' } as const;
export const INVALID_RESPONSE = { kind: 'invalid-response' } as const;
export const REQUEST_CANCELLED = { kind: 'request-cancelled' } as const;
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

export function mapAbortedTransportFailure<
  Failure extends { readonly kind: string },
>(signal: AbortSignal, failure: Failure): Failure | typeof REQUEST_CANCELLED {
  // Fetch may reject with AbortError before Effect observes the caller's
  // interruption. The caller's signal is authoritative in that race.
  return signal.aborted && failure.kind === 'transport'
    ? REQUEST_CANCELLED
    : failure;
}

export function mapReadHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpFailure {
  return (
    lookupProblemFailure(READ_PROBLEM_FAILURES, status, problem) ??
    mapStatusFailure(status)
  );
}

export function mapClaimHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpClaimFailure {
  return (
    lookupProblemFailure(CLAIM_PROBLEM_FAILURES, status, problem) ??
    mapStatusFailure(status)
  );
}

export function mapCaseSummaryHttpFailure(
  status: number,
  problem?: ProblemDetail,
): ResolverFollowUpCaseSummaryFailure {
  return (
    lookupProblemFailure(CASE_SUMMARY_PROBLEM_FAILURES, status, problem) ??
    mapReadHttpFailure(status, problem)
  );
}

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

function problemKey(status: number, type: string, signInPath?: string): string {
  // Including the advertised sign-in path in the identity prevents an
  // untrusted authentication problem from redirecting to an arbitrary path.
  return JSON.stringify([status, type, signInPath ?? null]);
}

function mapStatusFailure(status: number): SharedStatusFailure {
  const factory =
    STATUS_FAILURES.get(status) ??
    STATUS_CLASS_FAILURES.get(Math.trunc(status / 100)) ??
    unexpectedResponse;
  return factory(status);
}

export function isRetryableReadFailure(
  failure: HumanFollowUpFailure | ResolverFollowUpCaseSummaryFailure,
): boolean {
  return (
    failure.kind === 'transport' ||
    failure.kind === 'timeout' ||
    failure.kind === 'service-unavailable'
  );
}

export function isRetryableClaimSetupFailure(
  failure: HumanFollowUpClaimFailure,
): boolean {
  return failure.kind === 'transport' || failure.kind === 'service-unavailable';
}
