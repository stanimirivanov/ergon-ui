import type { HumanFollowUpReleaseFailure } from '@ergon/follow-up-data-access-web';

interface ReleaseFailureCopy {
  readonly title: string;
  readonly description: string;
  readonly canRetry: boolean;
}

const UNCERTAIN_RESULT = {
  title: 'The release result is not yet known.',
  description:
    'Try the same release again. The control plane returns the recorded result if it succeeded.',
  canRetry: true,
} as const;

const FAILURE_COPY = {
  'authentication-required': {
    title: 'Your browser session has expired.',
    description: 'Sign in again before releasing this work.',
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
    description: 'Ask a tenant administrator to confirm your actor binding.',
    canRetry: false,
  },
  'identity-rejected': {
    title: 'This identity cannot release follow-up work.',
    description: 'The control plane rejected the current tenant identity.',
    canRetry: false,
  },
  'resolver-authority-required': {
    title: 'Current resolver authority is required.',
    description: 'Your authority changed before the release could be recorded.',
    canRetry: false,
  },
  forbidden: {
    title: 'This work cannot be released under your current authority.',
    description: 'Ask a tenant administrator to review your resolver access.',
    canRetry: false,
  },
  'csrf-rejected': {
    title: 'The browser security check expired.',
    description: 'Try again to obtain a fresh session-bound security token.',
    canRetry: true,
  },
  'ownership-revision-conflict': {
    title: 'This follow-up changed before release.',
    description:
      'Your active-work list is refreshing. Review current ownership before trying again.',
    canRetry: false,
  },
  'invalid-release-command': {
    title: 'This release request was rejected.',
    description:
      'Refresh your active work or contact an operator if this continues.',
    canRetry: false,
  },
  'release-unavailable': {
    title: 'Releasing work is not enabled.',
    description:
      'An operator must enable the upgraded ownership deployment before release can be used.',
    canRetry: false,
  },
  'not-found': {
    title: 'This claim is no longer available.',
    description:
      'Your active-work list is refreshing. No other owner is disclosed.',
    canRetry: false,
  },
  timeout: UNCERTAIN_RESULT,
  transport: UNCERTAIN_RESULT,
  'service-unavailable': UNCERTAIN_RESULT,
  'unexpected-response': UNCERTAIN_RESULT,
  'invalid-response': UNCERTAIN_RESULT,
  'request-cancelled': {
    title: 'The release request was cancelled.',
    description:
      'Refresh active work before deciding whether another action is needed.',
    canRetry: false,
  },
} satisfies Readonly<
  Record<HumanFollowUpReleaseFailure['kind'], ReleaseFailureCopy>
>;

/** Selects release recovery copy without revealing another resolver's identity. */
export function releaseFailureCopy(
  failure: HumanFollowUpReleaseFailure,
): ReleaseFailureCopy {
  return FAILURE_COPY[failure.kind];
}
