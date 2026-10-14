import type { RunSupervisorHandoverFailure } from '@ergon/run-supervision-data-access-web';

interface HandoverFailurePresentation {
  readonly message: string;
  readonly recovery: 'replay' | 'recheck' | 'sign-in' | 'leave';
}

const failures: Readonly<
  Record<RunSupervisorHandoverFailure['kind'], HandoverFailurePresentation>
> = {
  'authentication-required': {
    message:
      'Sign in again. The transfer result cannot be confirmed from this session.',
    recovery: 'sign-in',
  },
  'authentication-unavailable': {
    message:
      'Browser authentication is unavailable. Do not assume that an earlier transfer was cancelled.',
    recovery: 'leave',
  },
  'actor-not-registered': {
    message: 'This session has no registered resolver in the tenant.',
    recovery: 'leave',
  },
  'identity-rejected': {
    message: 'This session identity is not accepted.',
    recovery: 'leave',
  },
  forbidden: {
    message:
      'The server denied this session. Current run context remains hidden.',
    recovery: 'leave',
  },
  'not-found': {
    message:
      'This run is unavailable under your current supervision or authority. A historical transfer may already have completed.',
    recovery: 'leave',
  },
  'invalid-page': {
    message:
      'The recipient request is invalid. Recheck the run before choosing again.',
    recovery: 'recheck',
  },
  'invalid-handover': {
    message:
      'The server rejected this handover request. Recheck the run before choosing again.',
    recovery: 'recheck',
  },
  'invalid-response': {
    message:
      'The response could not confirm the transfer. It may already be recorded; retry only the exact command.',
    recovery: 'replay',
  },
  transport: {
    message:
      'The response was lost. The transfer may already be recorded; retry only the exact command.',
    recovery: 'replay',
  },
  timeout: {
    message:
      'The request timed out. The transfer may already be recorded; retry only the exact command.',
    recovery: 'replay',
  },
  'request-cancelled': {
    message:
      'The request ended without confirmation. A sent transfer is not necessarily cancelled.',
    recovery: 'replay',
  },
  'unexpected-defect': {
    message:
      'The workbench could not confirm the result. The transfer may already be recorded; retain the exact command for retry.',
    recovery: 'replay',
  },
  'service-unavailable': {
    message:
      'The server could not confirm the result. Retry only the original handover command.',
    recovery: 'replay',
  },
  'unexpected-http-status': {
    message:
      'The response does not establish the transfer result. Retry only the original command.',
    recovery: 'replay',
  },
  'handover-disabled': {
    message:
      'Supervisor handover is disabled during rollout. This request made no new transfer; an earlier uncertain command may already have completed.',
    recovery: 'recheck',
  },
  'handover-conflict': {
    message:
      'The expected supervision revision or command intent is stale. Recheck before creating a different transfer.',
    recovery: 'recheck',
  },
  'handover-unavailable': {
    message:
      'This run can no longer be handed over. Recheck its current state.',
    recovery: 'recheck',
  },
  'recipient-not-eligible': {
    message:
      'The recipient is no longer another eligible resolver in this tenant. Recheck before choosing again.',
    recovery: 'recheck',
  },
  'csrf-rejected': {
    message:
      'The session security token was rejected. Explicit retry obtains a fresh token with the same command.',
    recovery: 'replay',
  },
};

export function handoverFailurePresentation(
  failure: RunSupervisorHandoverFailure,
): HandoverFailurePresentation {
  return failures[failure.kind];
}
