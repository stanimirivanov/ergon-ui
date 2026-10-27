import type { RequesterAnswerFailure } from '@ergon/requester-progress-data-access-web';

const UNCERTAIN = {
  message:
    'The answer recording outcome is uncertain. Do not create a replacement answer. Retry only the original intent.',
  replay: true,
} as const;
const DENIED = {
  message:
    'Answer recording access is unavailable. Recheck current case access; no answer or owner is disclosed by this result.',
  replay: false,
} as const;
const RECOVERY = {
  'authentication-required': {
    message:
      'Sign in again, then reopen the supplied case link. Leaving this page discards recovery intent, not a possible write.',
    replay: false,
  },
  forbidden: DENIED,
  'not-found': DENIED,
  'answer-conflict': {
    message:
      'The answer intent conflicts with recorded state. Recheck history; no competing answer is disclosed by this acknowledgement.',
    replay: false,
  },
  'invalid-answer': {
    message:
      'The server rejected this answer. Correct the input and review it again.',
    replay: false,
  },
  'csrf-rejected': {
    message:
      'The security token was rejected. Exact retry obtains fresh session CSRF without changing the answer.',
    replay: true,
  },
  unavailable: UNCERTAIN,
  timeout: UNCERTAIN,
  transport: UNCERTAIN,
  'invalid-response': UNCERTAIN,
  'unexpected-response': UNCERTAIN,
  'unexpected-defect': UNCERTAIN,
  'request-cancelled': UNCERTAIN,
} satisfies Record<
  RequesterAnswerFailure['kind'],
  { readonly message: string; readonly replay: boolean }
>;

/** Once recovery begins, a later rejection cannot establish that an earlier unobserved write never happened. */
export type AnswerAttemptMode = 'initial' | 'recovery';

/** Closed failure/action policy; only an initial input rejection allows correction. Recovery never unseals immutable intent. */
export function requesterAnswerRecovery(
  failure: RequesterAnswerFailure,
  mode: AnswerAttemptMode = 'initial',
): {
  readonly message: string;
  readonly replay: boolean;
  readonly canCorrect: boolean;
} {
  if (mode === 'recovery' && failure.kind === 'invalid-answer')
    return {
      message:
        'The original answer was rejected during recovery. Its earlier outcome remains uncertain. Do not change or replace the intent. Recheck history or contact an operator.',
      replay: false,
      canCorrect: false,
    };
  return {
    ...RECOVERY[failure.kind],
    canCorrect: failure.kind === 'invalid-answer',
  };
}
