import type {
  HumanFollowUpClaimFailure,
  HumanFollowUpFailure,
} from '@ergon/follow-up-data-access-web';

export interface FollowUpFailureCopy {
  readonly title: string;
  readonly description: string;
  readonly canRetry: boolean;
}

const SIGN_IN_UNAVAILABLE = {
  title: 'Browser sign-in is not configured.',
  description:
    'Ask an operator to configure the workbench authentication boundary.',
  canRetry: false,
} as const;

const ACCESS_NOT_PROVISIONED = {
  title: 'Your resolver access is no longer provisioned.',
  description:
    'Ask a tenant administrator to confirm your actor binding before continuing.',
  canRetry: false,
} as const;

const TEMPORARY_INBOX_FAILURE = {
  title: 'The resolver inbox is temporarily unavailable.',
  description:
    'The workbench could not load visible follow-up work. Try again after the control plane is reachable.',
  canRetry: true,
} as const;

const UNUSABLE_INBOX_RESPONSE = {
  title: 'The resolver inbox could not be loaded.',
  description:
    'The response was not safe to display. Try again or contact an operator.',
  canRetry: true,
} as const;

const INBOX_IDENTITY_REJECTED = {
  title: 'This identity cannot read the inbox.',
  description:
    'The control plane rejected the current tenant identity. No follow-up data is displayed.',
  canRetry: false,
} as const;

const INBOX_FAILURE_COPY = {
  'authentication-required': {
    title: 'Your browser session has expired.',
    description:
      'Sign in again before the workbench can request resolver data.',
    canRetry: false,
  },
  'authentication-unavailable': SIGN_IN_UNAVAILABLE,
  'actor-not-registered': ACCESS_NOT_PROVISIONED,
  'identity-rejected': INBOX_IDENTITY_REJECTED,
  forbidden: INBOX_IDENTITY_REJECTED,
  'invalid-filter': {
    title: 'The queue filter was rejected.',
    description:
      'Clear or correct the queue key before requesting follow-up work again.',
    canRetry: false,
  },
  'invalid-page': {
    title: 'This inbox page is no longer valid.',
    description:
      'Return to the first page and retry the request with a fresh cursor.',
    canRetry: false,
  },
  timeout: TEMPORARY_INBOX_FAILURE,
  transport: TEMPORARY_INBOX_FAILURE,
  'service-unavailable': TEMPORARY_INBOX_FAILURE,
  'unexpected-response': UNUSABLE_INBOX_RESPONSE,
  'invalid-response': UNUSABLE_INBOX_RESPONSE,
  'unexpected-defect': {
    title: 'The workbench could not read the inbox.',
    description:
      'An unexpected workbench problem interrupted this read. No follow-up data is displayed. Try again explicitly or contact an operator if it continues.',
    canRetry: true,
  },
  'request-cancelled': UNUSABLE_INBOX_RESPONSE,
} satisfies Readonly<Record<HumanFollowUpFailure['kind'], FollowUpFailureCopy>>;

const CLAIM_IDENTITY_REJECTED = {
  title: 'This identity cannot claim follow-up work.',
  description:
    'The control plane rejected the current tenant identity. No ownership was recorded.',
  canRetry: false,
} as const;

const AMBIGUOUS_CLAIM_RESULT = {
  title: 'The claim result is not yet known.',
  description:
    'Retrying this command is safe: if the first request succeeded, the control plane returns its recorded result.',
  canRetry: true,
} as const;

const UNUSABLE_CLAIM_RESPONSE = {
  title: 'The claim result could not be verified.',
  description:
    'The response was not safe to use. Retrying the same command is safe because its result is recorded.',
  canRetry: true,
} as const;

const CLAIM_FAILURE_COPY = {
  'authentication-required': {
    title: 'Your browser session has expired.',
    description: 'Sign in again before claiming resolver work.',
    canRetry: false,
  },
  'authentication-unavailable': SIGN_IN_UNAVAILABLE,
  'actor-not-registered': ACCESS_NOT_PROVISIONED,
  'resolver-authority-required': {
    title: 'Current resolver authority is required.',
    description:
      'Your authority changed before ownership could be recorded. The work was not claimed.',
    canRetry: false,
  },
  'identity-rejected': CLAIM_IDENTITY_REJECTED,
  forbidden: CLAIM_IDENTITY_REJECTED,
  'csrf-rejected': {
    title: 'The browser security check expired.',
    description:
      'Retry to obtain a fresh session-bound security token before claiming this work.',
    canRetry: true,
  },
  'already-claimed': {
    title: 'Another resolver claimed this work.',
    description:
      'The shared inbox is refreshing so the stale item can be removed.',
    canRetry: false,
  },
  'ownership-revision-conflict': {
    title: 'This follow-up changed before you claimed it.',
    description:
      'The shared inbox is refreshing so you can use the current ownership revision.',
    canRetry: false,
  },
  'claim-command-conflict': {
    title: 'This claim request could not be reused.',
    description:
      'The command identity was already used for different intent. Refresh the inbox before trying again.',
    canRetry: false,
  },
  'invalid-claim-command': {
    title: 'This claim request was rejected.',
    description:
      'The command was invalid. Refresh the inbox or contact an operator if this continues.',
    canRetry: false,
  },
  'not-found': {
    title: 'This follow-up is no longer available.',
    description:
      'The shared inbox is refreshing so the stale item can be removed.',
    canRetry: false,
  },
  timeout: AMBIGUOUS_CLAIM_RESULT,
  transport: AMBIGUOUS_CLAIM_RESULT,
  'service-unavailable': AMBIGUOUS_CLAIM_RESULT,
  'unexpected-response': UNUSABLE_CLAIM_RESPONSE,
  'invalid-response': UNUSABLE_CLAIM_RESPONSE,
  'unexpected-defect': {
    title: 'The workbench could not confirm the claim result.',
    description:
      'An unexpected workbench problem interrupted this command. Ownership may already have been recorded. Retry only this same command to recover its recorded result, or contact an operator if it continues.',
    canRetry: true,
  },
  'request-cancelled': UNUSABLE_CLAIM_RESPONSE,
} satisfies Readonly<
  Record<HumanFollowUpClaimFailure['kind'], FollowUpFailureCopy>
>;

/** Selects inbox recovery copy for one normalized read failure. */
export function inboxFailureCopy(
  failure: HumanFollowUpFailure,
): FollowUpFailureCopy {
  return INBOX_FAILURE_COPY[failure.kind];
}

/** Selects claim recovery copy without weakening idempotent-retry semantics. */
export function claimFailureCopy(
  failure: HumanFollowUpClaimFailure,
): FollowUpFailureCopy {
  return CLAIM_FAILURE_COPY[failure.kind];
}
