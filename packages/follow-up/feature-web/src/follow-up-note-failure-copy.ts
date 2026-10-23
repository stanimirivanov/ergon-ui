import type { FollowUpNoteFailure } from '@ergon/follow-up-data-access-web';

const NOTE_FAILURE_COPY: Record<FollowUpNoteFailure['kind'], string> = {
  'authentication-required': 'Sign in again before reading or saving notes.',
  'authentication-unavailable':
    'Browser authentication is unavailable. No outcome is confirmed.',
  'actor-not-registered': 'Your resolver identity is not registered.',
  'identity-rejected': 'The browser identity was rejected.',
  'resolver-authority-required': 'Current resolver authority is required.',
  forbidden: 'Notes access was denied.',
  'csrf-rejected':
    'The session security token was rejected. An explicit retry obtains a fresh token.',
  'not-found':
    'Notes are unavailable. The follow-up may no longer be open and owned by you.',
  'note-conflict':
    'The claim changed or this note identity conflicts. Recheck current ownership before creating another note.',
  'invalid-note': 'The server rejected the note text or ownership revision.',
  timeout: 'The save outcome is uncertain after a timeout.',
  transport: 'The save outcome is uncertain after a connection failure.',
  'service-unavailable':
    'The service is unavailable; the save outcome is not confirmed.',
  'unexpected-response':
    'The server returned an unexpected result; the save outcome is not confirmed.',
  'invalid-response':
    'The receipt could not be validated; the save outcome is uncertain.',
  'unexpected-defect':
    'The save outcome is uncertain after an unexpected client failure.',
  'request-cancelled':
    'The request was cancelled; this does not prove the note was not saved.',
};

export function noteFailureCopy(failure: FollowUpNoteFailure): string {
  return NOTE_FAILURE_COPY[failure.kind];
}

export function canReplayNote(failure: FollowUpNoteFailure): boolean {
  return new Set<FollowUpNoteFailure['kind']>([
    'csrf-rejected',
    'timeout',
    'transport',
    'service-unavailable',
    'unexpected-response',
    'invalid-response',
    'unexpected-defect',
    'request-cancelled',
  ]).has(failure.kind);
}

export function withdrawsNoteAccess(failure: {
  readonly kind: string;
}): boolean {
  return new Set([
    'authentication-required',
    'authentication-unavailable',
    'actor-not-registered',
    'identity-rejected',
    'resolver-authority-required',
    'forbidden',
    'not-found',
    'note-conflict',
  ]).has(failure.kind);
}
