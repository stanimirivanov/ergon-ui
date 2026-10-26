import type { FollowUpQuestionFailure } from '@ergon/follow-up-data-access-web';

const UNCERTAIN = {
  message:
    'The recording outcome is uncertain. Do not create a replacement question. Retry only the original intent.',
  replay: true,
  withdraw: false,
} as const;
const WITHDRAW = {
  message:
    'Current question access is unavailable. Recheck owned work before continuing.',
  replay: false,
  withdraw: true,
} as const;
const RECOVERY = {
  'authentication-required': WITHDRAW,
  'authentication-unavailable': WITHDRAW,
  'actor-not-registered': WITHDRAW,
  'identity-rejected': WITHDRAW,
  'resolver-authority-required': WITHDRAW,
  forbidden: WITHDRAW,
  'not-found': WITHDRAW,
  'question-conflict': WITHDRAW,
  'invalid-question': {
    message:
      'The server rejected the question or ownership revision. Correct the input and confirm again.',
    replay: false,
    withdraw: false,
  },
  'csrf-rejected': {
    message:
      'The security token was rejected. Explicit exact retry obtains a fresh token.',
    replay: true,
    withdraw: false,
  },
  timeout: UNCERTAIN,
  transport: UNCERTAIN,
  'service-unavailable': UNCERTAIN,
  'unexpected-response': UNCERTAIN,
  'invalid-response': UNCERTAIN,
  'unexpected-defect': UNCERTAIN,
  'request-cancelled': UNCERTAIN,
} satisfies Record<
  FollowUpQuestionFailure['kind'],
  {
    readonly message: string;
    readonly replay: boolean;
    readonly withdraw: boolean;
  }
>;

/** Failure text and allowed action share one closed policy; receipt possession never restores access. */
export function questionRecovery(failure: FollowUpQuestionFailure): {
  readonly message: string;
  readonly replay: boolean;
  readonly withdraw: boolean;
} {
  return RECOVERY[failure.kind];
}
