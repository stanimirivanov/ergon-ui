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

const failureDescriptions: Readonly<
  Record<RunSupervisionFailure['kind'], string>
> = {
  'authentication-required':
    'Your browser session needs sign-in before assigned work can be read.',
  'authentication-unavailable':
    'Browser authentication is not enabled or configured for this control plane. Ask an operator to check the BFF configuration.',
  'actor-not-registered':
    'The signed-in identity is not registered as an Ergon actor.',
  'identity-rejected':
    'The control plane could not accept this browser identity.',
  forbidden:
    'The control plane did not permit this read. Ask an administrator to check your current authority. No private run context is shown.',
  'not-found':
    'No run context is available for this request. This does not disclose whether the run exists or who supervises it.',
  'invalid-page':
    'The assigned-work page could not be read. Return to the first page and retry.',
  'invalid-response':
    'The service response could not be safely read. No retained run context is shown.',
  transport:
    'The service could not be reached. Check your connection and retry.',
  timeout:
    'The read did not finish within its timeout. Retry to request a fresh snapshot.',
  'request-cancelled':
    'The read was cancelled. Retry to request a fresh snapshot.',
  'service-unavailable':
    'The service is temporarily unavailable. Retry to request a fresh snapshot.',
  'unexpected-http-status':
    'The service could not complete this read. Retry to request a fresh snapshot.',
};
const failureDescriptionLookup = new Map(Object.entries(failureDescriptions));
const noManualRetry = new Set([
  'authentication-required',
  'authentication-unavailable',
  'actor-not-registered',
  'identity-rejected',
  'forbidden',
  'invalid-page',
]);

export function canOfferReadRetry(error: unknown): boolean {
  return !(
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string' &&
    noManualRetry.has(error.kind)
  );
}

export function failureDescription(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    // RTK Query can also expose a serialized defect; only known typed failures get capability copy.
    const description = failureDescriptionLookup.get(error.kind);
    if (description !== undefined) return description;
  }
  return 'The read could not be completed. No retained private context is shown. Retry to request a fresh snapshot.';
}

export function needsSignIn(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'authentication-required'
  );
}

export function isUnavailable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'not-found'
  );
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
