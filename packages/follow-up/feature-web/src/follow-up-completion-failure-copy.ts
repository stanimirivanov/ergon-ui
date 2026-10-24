import type { FollowUpCompletionFailure } from '@ergon/follow-up-data-access-web';

const COPY: Record<FollowUpCompletionFailure['kind'], string> = {
  'authentication-required': 'Sign in again before recovering this completion.',
  'authentication-unavailable': 'Browser authentication is unavailable.',
  'actor-not-registered':
    'Your resolver identity is not registered in this tenant.',
  'identity-rejected': 'The current browser identity was rejected.',
  'resolver-authority-required': 'Current resolver authority is required.',
  forbidden: 'Current access was denied. Recheck before continuing.',
  'csrf-rejected':
    'The browser security token was rejected. Recheck before confirming another intent.',
  'not-found':
    'Owned work is unavailable. This does not disclose completion, another owner or lost authority.',
  'completion-conflict':
    'The original claim, revision or command intent conflicts. Recheck owned work before another confirmation.',
  'invalid-completion':
    'The completion intent was rejected. Recheck current owned work.',
  'completion-unavailable':
    'Administrative follow-up completion is not enabled in this deployment.',
  timeout: 'The completion outcome is uncertain after a timeout.',
  transport: 'The completion outcome is uncertain after a connection failure.',
  'service-unavailable':
    'The service is unavailable; the completion outcome is uncertain.',
  'unexpected-response':
    'The server result was unexpected; the completion outcome is uncertain.',
  'invalid-response':
    'The receipt could not be validated; the completion outcome is uncertain.',
  'unexpected-defect':
    'An unexpected workbench failure left the completion outcome uncertain.',
  'request-cancelled':
    'The request was cancelled; the completion outcome is uncertain.',
};
const REPLAYABLE = new Set<FollowUpCompletionFailure['kind']>([
  'timeout',
  'transport',
  'service-unavailable',
  'unexpected-response',
  'invalid-response',
  'unexpected-defect',
  'request-cancelled',
]);

export function completionFailureCopy(
  failure: FollowUpCompletionFailure,
): string {
  return COPY[failure.kind];
}
export function canReplayCompletion(
  failure: FollowUpCompletionFailure,
): boolean {
  return REPLAYABLE.has(failure.kind);
}
