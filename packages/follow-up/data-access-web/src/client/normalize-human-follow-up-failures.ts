import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpCommandFailure,
  HumanFollowUpFailure,
  HumanFollowUpReleaseFailure,
  ResolverFollowUpCaseSummaryFailure,
} from './human-follow-up-failures';

type StatusFailure = Extract<HumanFollowUpFailure, { readonly status: number }>;
type StatusKind = StatusFailure['kind'];
type SimpleFailures<Failure extends { readonly kind: string }> = {
  [Kind in Exclude<Failure['kind'], StatusKind>]: Extract<
    Failure,
    { readonly kind: Kind }
  >;
};

export const UNEXPECTED_FOLLOW_UP_DEFECT = Object.freeze({
  kind: 'unexpected-defect',
} as const);

const READ_FAILURES = {
  'authentication-required': { kind: 'authentication-required' },
  'authentication-unavailable': { kind: 'authentication-unavailable' },
  'actor-not-registered': { kind: 'actor-not-registered' },
  'identity-rejected': { kind: 'identity-rejected' },
  forbidden: { kind: 'forbidden' },
  'invalid-filter': { kind: 'invalid-filter' },
  'invalid-page': { kind: 'invalid-page' },
  timeout: { kind: 'timeout' },
  transport: { kind: 'transport' },
  'invalid-response': { kind: 'invalid-response' },
  'request-cancelled': { kind: 'request-cancelled' },
  'unexpected-defect': UNEXPECTED_FOLLOW_UP_DEFECT,
} satisfies SimpleFailures<HumanFollowUpFailure>;

const COMMAND_FAILURES = {
  'authentication-required': { kind: 'authentication-required' },
  'authentication-unavailable': { kind: 'authentication-unavailable' },
  'actor-not-registered': { kind: 'actor-not-registered' },
  'identity-rejected': { kind: 'identity-rejected' },
  'resolver-authority-required': { kind: 'resolver-authority-required' },
  'csrf-rejected': { kind: 'csrf-rejected' },
  forbidden: { kind: 'forbidden' },
  timeout: { kind: 'timeout' },
  transport: { kind: 'transport' },
  'invalid-response': { kind: 'invalid-response' },
  'request-cancelled': { kind: 'request-cancelled' },
  'unexpected-defect': UNEXPECTED_FOLLOW_UP_DEFECT,
} satisfies SimpleFailures<HumanFollowUpCommandFailure>;

const READ_FAILURE_MAP = new Map(Object.entries(READ_FAILURES));
const SUMMARY_FAILURE_MAP = new Map(
  Object.entries({
    ...READ_FAILURES,
    'not-found': { kind: 'not-found' },
  } satisfies SimpleFailures<ResolverFollowUpCaseSummaryFailure>),
);
const CLAIM_FAILURE_MAP = new Map(
  Object.entries({
    ...COMMAND_FAILURES,
    'already-claimed': { kind: 'already-claimed' },
    'ownership-revision-conflict': { kind: 'ownership-revision-conflict' },
    'claim-command-conflict': { kind: 'claim-command-conflict' },
    'invalid-claim-command': { kind: 'invalid-claim-command' },
    'not-found': { kind: 'not-found' },
  } satisfies SimpleFailures<HumanFollowUpClaimFailure>),
);
const RELEASE_FAILURE_MAP = new Map(
  Object.entries({
    ...COMMAND_FAILURES,
    'ownership-revision-conflict': { kind: 'ownership-revision-conflict' },
    'invalid-release-command': { kind: 'invalid-release-command' },
    'release-unavailable': { kind: 'release-unavailable' },
    'not-found': { kind: 'not-found' },
  } satisfies SimpleFailures<HumanFollowUpReleaseFailure>),
);

/**
 * Projects an unknown cache/framework failure into the closed read contract.
 *
 * Only known kinds and integer HTTP statuses from 100 through 599 survive.
 * Extra fields, raw causes, and serialized exception details are discarded;
 * unknown or malformed values become `unexpected-defect`, not server errors.
 * RTK's exact plain, two-field AbortError/Aborted fingerprint is recognized;
 * a thrown client error is contained separately and never reaches this matcher.
 */
export function normalizeHumanFollowUpFailure(
  value: unknown,
): HumanFollowUpFailure {
  return normalizeFailure(value, READ_FAILURE_MAP);
}

/**
 * Normalizes claim failures without inferring whether the write was recorded.
 *
 * Unknown failures become `unexpected-defect`. Explicit replay must retain the
 * original command ID, work-item identity, and expected ownership revision.
 * Normalization shares the read normalizer's status and payload-safety rules.
 */
export function normalizeHumanFollowUpClaimFailure(
  value: unknown,
): HumanFollowUpClaimFailure {
  return normalizeFailure(value, CLAIM_FAILURE_MAP);
}

/**
 * Normalizes release failures while preserving an uncertain command outcome.
 *
 * Unknown failures become `unexpected-defect`; an explicit replay retains the
 * exact claim/work-item identity and expected revision. Status validation and
 * removal of surplus fields follow the read normalizer's contract.
 */
export function normalizeHumanFollowUpReleaseFailure(
  value: unknown,
): HumanFollowUpReleaseFailure {
  return normalizeFailure(value, RELEASE_FAILURE_MAP);
}

/**
 * Normalizes private case-context failures, including non-disclosing `not-found`.
 *
 * Status validation and safe payload projection match the read normalizer.
 * Unknown failures never masquerade as malformed evidence or resource absence.
 */
export function normalizeResolverFollowUpCaseSummaryFailure(
  value: unknown,
): ResolverFollowUpCaseSummaryFailure {
  return normalizeFailure(value, SUMMARY_FAILURE_MAP);
}

function normalizeFailure<Failure extends { readonly kind: string }>(
  value: unknown,
  failures: ReadonlyMap<string, Failure>,
):
  | Failure
  | StatusFailure
  | { readonly kind: 'request-cancelled' }
  | typeof UNEXPECTED_FOLLOW_UP_DEFECT {
  try {
    if (typeof value !== 'object' || value === null) {
      return UNEXPECTED_FOLLOW_UP_DEFECT;
    }
    if (!('kind' in value)) {
      const fields = Object.keys(value);
      return Object.getPrototypeOf(value) === Object.prototype &&
        fields.length === 2 &&
        fields.includes('name') &&
        fields.includes('message') &&
        'name' in value &&
        value.name === 'AbortError' &&
        'message' in value &&
        value.message === 'Aborted'
        ? { kind: 'request-cancelled' }
        : UNEXPECTED_FOLLOW_UP_DEFECT;
    }
    const kind = value.kind;
    if (typeof kind !== 'string') return UNEXPECTED_FOLLOW_UP_DEFECT;
    if (kind === 'service-unavailable' || kind === 'unexpected-response') {
      const status = 'status' in value ? value.status : undefined;
      if (
        typeof status === 'number' &&
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
      ) {
        return { kind, status };
      }
      return UNEXPECTED_FOLLOW_UP_DEFECT;
    }
    const failure = failures.get(kind);
    return failure === undefined ? UNEXPECTED_FOLLOW_UP_DEFECT : { ...failure };
  } catch {
    // An accessor/proxy defect is not permission to expose the thrown cause.
    return UNEXPECTED_FOLLOW_UP_DEFECT;
  }
}
