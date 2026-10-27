import type { IntakeFailure } from '@ergon/requester-intake-data-access-web';
export type IntakeAttemptMode = 'initial' | 'recovery';
const notices: Readonly<
  Record<IntakeFailure['kind'], { message: string; replay: boolean }>
> = {
  'authentication-required': {
    message:
      'Sign in to Ergon again. Leaving retires local recovery but cannot undo a write.',
    replay: false,
  },
  forbidden: {
    message:
      'This identity cannot submit this request. Contact your support team; do not replace the intent to bypass denial.',
    replay: false,
  },
  'intake-conflict': {
    message:
      'This intake identity conflicts. Do not create a replacement to bypass this result. Contact your support team.',
    replay: false,
  },
  'invalid-input': {
    message:
      'The input was rejected. Check both fields and review the request again.',
    replay: false,
  },
  'csrf-rejected': {
    message:
      'Session protection was rejected. Retry only the exact request with fresh session protection.',
    replay: true,
  },
  unavailable: {
    message:
      'The service is unavailable. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  timeout: {
    message:
      'The request timed out. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  transport: {
    message:
      'The connection failed. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  'invalid-response': {
    message:
      'The acknowledgement could not be verified. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  'unexpected-response': {
    message:
      'The server response was unexpected. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  'unexpected-defect': {
    message:
      'Submission could not be observed safely. The outcome is uncertain; retry only the exact request.',
    replay: true,
  },
  'request-cancelled': {
    message:
      'Observation was cancelled, not the server write. Retry only the exact request.',
    replay: true,
  },
};
/** Once recovery begins, even input rejection cannot prove an earlier unobserved write did not commit. */
export function intakeRecovery(
  failure: IntakeFailure,
  mode: IntakeAttemptMode,
): {
  readonly message: string;
  readonly replay: boolean;
  readonly canCorrect: boolean;
} {
  if (failure.kind === 'invalid-input' && mode === 'recovery')
    return {
      message:
        'Input was rejected during recovery. The earlier outcome remains uncertain. Do not replace this intent; contact your support team.',
      replay: false,
      canCorrect: false,
    };
  return {
    ...notices[failure.kind],
    canCorrect: failure.kind === 'invalid-input' && mode === 'initial',
  };
}
