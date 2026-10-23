import type { FollowUpHandoverFailure } from '@ergon/follow-up-data-access-web';

const COPY: Record<FollowUpHandoverFailure['kind'], string> = {
  'authentication-required': 'Sign in again before recovering this handover.',
  'authentication-unavailable': 'Browser authentication is unavailable.',
  'actor-not-registered':
    'Your resolver identity is not registered in this tenant.',
  'identity-rejected': 'The current browser identity was rejected.',
  'resolver-authority-required': 'Current resolver authority is required.',
  forbidden: 'Current access was denied. Recheck before continuing.',
  'csrf-rejected':
    'The browser security token was rejected. Recheck before confirming another intent.',
  'not-found':
    'Owned work is unavailable. This does not disclose closure, another owner or lost authority.',
  'handover-conflict':
    'The original claim, revision or command intent conflicts. Recheck owned work before another confirmation.',
  'recipient-unavailable':
    'The recipient is unavailable. Missing, other-tenant and ineligible resolvers share this result.',
  'invalid-handover':
    'The recipient or claim revision was rejected. A distinct authorized resolver is required.',
  'handover-unavailable':
    'Direct follow-up handover is not enabled in this deployment.',
  timeout: 'The handover outcome is uncertain after a timeout.',
  transport: 'The handover outcome is uncertain after a connection failure.',
  'service-unavailable':
    'The service is unavailable; the handover outcome is uncertain.',
  'unexpected-response':
    'The server result was unexpected; the handover outcome is uncertain.',
  'invalid-response':
    'The receipt could not be validated; the handover outcome is uncertain.',
  'unexpected-defect':
    'An unexpected workbench failure left the handover outcome uncertain.',
  'request-cancelled':
    'The request was cancelled; the handover outcome is uncertain.',
};
const REPLAYABLE = new Set<FollowUpHandoverFailure['kind']>([
  'timeout',
  'transport',
  'service-unavailable',
  'unexpected-response',
  'invalid-response',
  'unexpected-defect',
  'request-cancelled',
]);

export function handoverFailureCopy(failure: FollowUpHandoverFailure): string {
  return COPY[failure.kind];
}

export function canReplayHandover(failure: FollowUpHandoverFailure): boolean {
  return REPLAYABLE.has(failure.kind);
}
