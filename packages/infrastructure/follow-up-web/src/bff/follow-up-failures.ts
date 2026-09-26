import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  ResolverFollowUpCaseSummaryFailure,
} from '@ergon/application-follow-up';

import type { ProblemDetail } from './follow-up-wire-schemas';

const BROWSER_SIGN_IN_PATH = '/bff/login' as const;

// Application failures remain serializable and do not disclose browser or
// network internals to Redux state, logs, or presentation code.
export const TRANSPORT_FAILURE = { kind: 'transport' } as const;
export const INVALID_RESPONSE = { kind: 'invalid-response' } as const;
export const REQUEST_CANCELLED = { kind: 'request-cancelled' } as const;
export const TIMEOUT_FAILURE = { kind: 'timeout' } as const;

export function mapReadHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpFailure {
  if (
    status === 401 &&
    problem?.type === 'urn:ergon:problem:browser-authentication-required' &&
    problem.signInPath === BROWSER_SIGN_IN_PATH
  ) {
    return { kind: 'authentication-required' };
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

export function mapClaimHttpFailure(
  status: number,
  problem?: ProblemDetail,
): HumanFollowUpClaimFailure {
  if (
    status === 401 &&
    problem?.type === 'urn:ergon:problem:browser-authentication-required' &&
    problem.signInPath === BROWSER_SIGN_IN_PATH
  ) {
    return { kind: 'authentication-required' };
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

export function mapCaseSummaryHttpFailure(
  status: number,
  problem?: ProblemDetail,
): ResolverFollowUpCaseSummaryFailure {
  if (
    status === 404 &&
    problem?.type ===
      'urn:ergon:problem:resolver-follow-up-case-summary-not-found'
  ) {
    return { kind: 'not-found' };
  }
  return mapReadHttpFailure(status, problem);
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
