import type { FollowUpPriorityFailure } from '@ergon/follow-up-data-access-web';

/** Shared transport/security outcomes retain uncertainty; priority-specific denials remain neutral. */
export function priorityFailureCopy(failure: FollowUpPriorityFailure): string {
  switch (failure.kind) {
    case 'not-found':
      return 'The original active claim is unavailable. Recheck owned work; a former owner cannot recover priority receipts.';
    case 'priority-conflict':
      return 'Ownership, priority revision or original intent changed. Recheck before confirming a new assignment.';
    case 'invalid-priority':
      return 'The priority intent was rejected. Recheck current metadata.';
    case 'priority-unavailable':
      return 'Priority assignments are not enabled in this deployment.';
    case 'authentication-required':
      return 'Sign in again before recovering priority.';
    case 'authentication-unavailable':
      return 'Browser authentication is unavailable.';
    case 'actor-not-registered':
      return 'Your resolver identity is not registered in this tenant.';
    case 'identity-rejected':
      return 'The current browser identity was rejected.';
    case 'resolver-authority-required':
      return 'Current resolver authority is required.';
    case 'forbidden':
      return 'Current access was denied. Recheck before continuing.';
    case 'csrf-rejected':
      return 'The browser security token was rejected. Recheck before confirming another intent.';
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
    case 'unexpected-response':
    case 'invalid-response':
    case 'unexpected-defect':
    case 'request-cancelled':
      return 'The priority assignment outcome is uncertain. A cancelled or failed request may already have committed. Nothing retries automatically.';
  }
}
export function canReplayPriority(failure: FollowUpPriorityFailure): boolean {
  switch (failure.kind) {
    case 'not-found':
    case 'priority-conflict':
    case 'invalid-priority':
    case 'priority-unavailable':
      return false;
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
    case 'unexpected-response':
    case 'invalid-response':
    case 'unexpected-defect':
    case 'request-cancelled':
      return true;
    default:
      return false;
  }
}
