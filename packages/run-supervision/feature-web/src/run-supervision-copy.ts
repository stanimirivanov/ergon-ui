import type {
  AssignedRunConsole,
  RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';

export const runStateLabels: Readonly<
  Record<AssignedRunConsole['state'], string>
> = {
  WAITING_FOR_APPROVAL: 'Waiting for approval',
  READY_FOR_AUTHORIZATION: 'Ready for authorization',
  VERIFYING: 'Verifying',
  ACTION_FAILED: 'Action failed',
  VERIFIED_RESOLVED: 'Recorded resolved',
  SUPERSEDED: 'Superseded',
  ESCALATED: 'Escalated',
};

interface RunSupervisionFailureCopy {
  readonly description: string;
  readonly recovery: 'sign-in' | 'reset-page' | 'retry-read' | 'none';
}

const failureCopy = {
  'authentication-required': {
    description:
      'Your browser session needs sign-in before assigned work can be read.',
    recovery: 'sign-in',
  },
  'authentication-unavailable': {
    description:
      'Browser authentication is not enabled or configured for this control plane. Ask an operator to check the BFF configuration.',
    recovery: 'none',
  },
  'actor-not-registered': {
    description: 'The signed-in identity is not registered as an Ergon actor.',
    recovery: 'none',
  },
  'identity-rejected': {
    description: 'The control plane could not accept this browser identity.',
    recovery: 'none',
  },
  forbidden: {
    description:
      'The control plane did not permit this read. Ask an administrator to check your current authority. No private run context is shown.',
    recovery: 'none',
  },
  'not-found': {
    description:
      'No run context is available for this request. This does not disclose whether the run exists or who supervises it.',
    recovery: 'retry-read',
  },
  'invalid-page': {
    description:
      'The assigned-work page could not be read. Return to the first page to start a fresh traversal.',
    recovery: 'reset-page',
  },
  'invalid-response': {
    description:
      'The service response could not be safely read. No retained run context is shown.',
    recovery: 'retry-read',
  },
  'unexpected-defect': {
    description:
      'The workbench encountered an unexpected problem while reading this snapshot. No retained private context is shown. Contact an operator if it continues.',
    recovery: 'retry-read',
  },
  transport: {
    description:
      'The service could not be reached. Check your connection and retry.',
    recovery: 'retry-read',
  },
  timeout: {
    description:
      'The read did not finish within its timeout. Retry to request a fresh snapshot.',
    recovery: 'retry-read',
  },
  'request-cancelled': {
    description: 'The read was cancelled. Retry to request a fresh snapshot.',
    recovery: 'retry-read',
  },
  'service-unavailable': {
    description:
      'The service is temporarily unavailable. Retry to request a fresh snapshot.',
    recovery: 'retry-read',
  },
  'unexpected-http-status': {
    description:
      'The service could not complete this read. Retry to request a fresh snapshot.',
    recovery: 'retry-read',
  },
} satisfies Readonly<
  Record<RunSupervisionFailure['kind'], RunSupervisionFailureCopy>
>;

/** Selects copy and recovery together after the cache error has been normalized. */
export function runSupervisionFailureCopy(
  failure: RunSupervisionFailure,
): RunSupervisionFailureCopy {
  return failureCopy[failure.kind];
}

export function isTerminalState(state: AssignedRunConsole['state']): boolean {
  return (
    state === 'VERIFIED_RESOLVED' ||
    state === 'SUPERSEDED' ||
    state === 'ESCALATED'
  );
}

const recordedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

export function formatRecordedAt(value: string): string {
  return `${recordedAtFormatter.format(new Date(value))} UTC`;
}
