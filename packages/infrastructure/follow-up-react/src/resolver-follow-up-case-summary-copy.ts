import type { ResolverFollowUpCaseSummaryFailure } from '@ergon/application-follow-up';

interface CaseSummaryFailureCopy {
  readonly title: string;
  readonly description: string;
  readonly canRetry: boolean;
}

const IDENTITY_REJECTED = {
  title: 'This identity cannot read case context.',
  description:
    'The control plane rejected the current tenant identity. No case evidence is displayed.',
  canRetry: false,
} as const;

const TEMPORARY_FAILURE = {
  title: 'Case context is temporarily unavailable.',
  description:
    'The workbench could not load the case evidence. Try again after the control plane is reachable.',
  canRetry: true,
} as const;

const UNUSABLE_RESPONSE = {
  title: 'Case context could not be loaded.',
  description:
    'The response was not safe to display. Try again or contact an operator.',
  canRetry: true,
} as const;

const FAILURE_COPY = {
  'authentication-required': {
    title: 'Your browser session has expired.',
    description: 'Sign in again before requesting case context.',
    canRetry: false,
  },
  'authentication-unavailable': {
    title: 'Browser sign-in is not configured.',
    description:
      'Ask an operator to configure the workbench authentication boundary.',
    canRetry: false,
  },
  'actor-not-registered': {
    title: 'Your resolver access is no longer provisioned.',
    description:
      'Ask a tenant administrator to confirm your actor binding before continuing.',
    canRetry: false,
  },
  'identity-rejected': IDENTITY_REJECTED,
  forbidden: IDENTITY_REJECTED,
  'not-found': {
    title: 'Case context is no longer available.',
    description:
      'The follow-up may have changed since this page was loaded. Refresh your active work before continuing.',
    canRetry: false,
  },
  timeout: TEMPORARY_FAILURE,
  transport: TEMPORARY_FAILURE,
  'service-unavailable': TEMPORARY_FAILURE,
  'invalid-filter': UNUSABLE_RESPONSE,
  'invalid-page': UNUSABLE_RESPONSE,
  'unexpected-response': UNUSABLE_RESPONSE,
  'invalid-response': UNUSABLE_RESPONSE,
  'request-cancelled': UNUSABLE_RESPONSE,
} satisfies Readonly<
  Record<ResolverFollowUpCaseSummaryFailure['kind'], CaseSummaryFailureCopy>
>;

/** Selects recovery copy without disclosing why case context was unavailable. */
export function caseSummaryFailureCopy(
  failure: ResolverFollowUpCaseSummaryFailure,
): CaseSummaryFailureCopy {
  return FAILURE_COPY[failure.kind];
}
