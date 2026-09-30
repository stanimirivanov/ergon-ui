import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
  ResolverFollowUpCaseSummaryFailure,
} from '@ergon/infrastructure-follow-up-web';

const INVALID_RESPONSE = { kind: 'invalid-response' } as const;

const READ_FAILURES: Readonly<Record<string, HumanFollowUpFailure>> = {
  'authentication-required': { kind: 'authentication-required' },
  'authentication-unavailable': { kind: 'authentication-unavailable' },
  'actor-not-registered': { kind: 'actor-not-registered' },
  'identity-rejected': { kind: 'identity-rejected' },
  forbidden: { kind: 'forbidden' },
  'invalid-filter': { kind: 'invalid-filter' },
  'invalid-page': { kind: 'invalid-page' },
  timeout: { kind: 'timeout' },
  transport: { kind: 'transport' },
  'invalid-response': INVALID_RESPONSE,
  'request-cancelled': { kind: 'request-cancelled' },
};

const CLAIM_FAILURES: Readonly<Record<string, HumanFollowUpClaimFailure>> = {
  'authentication-required': { kind: 'authentication-required' },
  'authentication-unavailable': { kind: 'authentication-unavailable' },
  'actor-not-registered': { kind: 'actor-not-registered' },
  'identity-rejected': { kind: 'identity-rejected' },
  'resolver-authority-required': { kind: 'resolver-authority-required' },
  'csrf-rejected': { kind: 'csrf-rejected' },
  'already-claimed': { kind: 'already-claimed' },
  'not-found': { kind: 'not-found' },
  forbidden: { kind: 'forbidden' },
  timeout: { kind: 'timeout' },
  transport: { kind: 'transport' },
  'invalid-response': INVALID_RESPONSE,
  'request-cancelled': { kind: 'request-cancelled' },
};

const CASE_SUMMARY_FAILURES: Readonly<
  Record<string, ResolverFollowUpCaseSummaryFailure>
> = {
  ...READ_FAILURES,
  'not-found': { kind: 'not-found' },
};

/**
 * Narrows an RTK Query error to a presentation-safe follow-up read failure.
 *
 * Unknown shapes and failure kinds fail closed as `invalid-response`. HTTP
 * status is retained only for the two application outcomes that define it.
 */
export function normalizeFollowUpReadFailure(
  error: unknown,
): HumanFollowUpFailure {
  const kind = failureKind(error);
  if (kind === 'service-unavailable' || kind === 'unexpected-response') {
    return { kind, status: failureStatus(error) };
  }
  return kind === undefined
    ? INVALID_RESPONSE
    : (READ_FAILURES[kind] ?? INVALID_RESPONSE);
}

/** Applies the claim-specific failure vocabulary while rejecting unknown data. */
export function normalizeFollowUpClaimFailure(
  error: unknown,
): HumanFollowUpClaimFailure {
  const kind = failureKind(error);
  if (kind === 'service-unavailable' || kind === 'unexpected-response') {
    return { kind, status: failureStatus(error) };
  }
  return kind === undefined
    ? INVALID_RESPONSE
    : (CLAIM_FAILURES[kind] ?? INVALID_RESPONSE);
}

/** Preserves the case-summary `not-found` non-disclosure outcome. */
export function normalizeFollowUpCaseSummaryFailure(
  error: unknown,
): ResolverFollowUpCaseSummaryFailure {
  const kind = failureKind(error);
  if (kind === 'service-unavailable' || kind === 'unexpected-response') {
    return { kind, status: failureStatus(error) };
  }
  return kind === undefined
    ? INVALID_RESPONSE
    : (CASE_SUMMARY_FAILURES[kind] ?? INVALID_RESPONSE);
}

function failureKind(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
    ? error.kind
    : undefined;
}

function failureStatus(error: unknown): number {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : 0;
}
