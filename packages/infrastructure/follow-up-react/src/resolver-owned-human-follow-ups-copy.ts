import type { HumanFollowUpFailure } from '@ergon/infrastructure-follow-up-web';

interface OwnedWorkFailureCopy {
  readonly title: string;
  readonly description: string;
  readonly canRetry: boolean;
}

const IDENTITY_REJECTED = {
  title: 'This identity cannot read active work.',
  description:
    'The control plane rejected the current tenant identity. No follow-up data is displayed.',
  canRetry: false,
} as const;

const INVALID_PAGE = {
  title: 'This claimed-work page is no longer valid.',
  description:
    'Return to the first page and retry the request with a fresh cursor.',
  canRetry: false,
} as const;

const TEMPORARY_FAILURE = {
  title: 'Your active work is temporarily unavailable.',
  description:
    'The workbench could not load claimed follow-ups. Try again after the control plane is reachable.',
  canRetry: true,
} as const;

const UNUSABLE_RESPONSE = {
  title: 'Your active work could not be loaded.',
  description:
    'The response was not safe to display. Try again or contact an operator.',
  canRetry: true,
} as const;

const FAILURE_COPY = {
  'authentication-required': {
    title: 'Your browser session has expired.',
    description: 'Sign in again before requesting your active work.',
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
  'invalid-filter': INVALID_PAGE,
  'invalid-page': INVALID_PAGE,
  timeout: TEMPORARY_FAILURE,
  transport: TEMPORARY_FAILURE,
  'service-unavailable': TEMPORARY_FAILURE,
  'unexpected-response': UNUSABLE_RESPONSE,
  'invalid-response': UNUSABLE_RESPONSE,
  'request-cancelled': UNUSABLE_RESPONSE,
} satisfies Readonly<
  Record<HumanFollowUpFailure['kind'], OwnedWorkFailureCopy>
>;

/** Selects active-work recovery copy for one normalized read failure. */
export function ownedWorkFailureCopy(
  failure: HumanFollowUpFailure,
): OwnedWorkFailureCopy {
  return FAILURE_COPY[failure.kind];
}
