import { Effect } from 'effect';
import type {
  FollowUpNotesClient,
  FollowUpNotesQuery,
  FollowUpNoteFailure,
  AppendFollowUpNoteCommand,
} from '../client/follow-up-notes';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import type { FollowUpNote } from '@ergon/follow-up-model';
import type { BrowserCsrfToken } from './follow-up-wire-schemas';
import { TRANSPORT_FAILURE } from './follow-up-failures';
import {
  decodeFollowUpNote,
  decodeFollowUpNotes,
} from './follow-up-note-codecs';
import { runRead } from './follow-up-read-adapter';

/** Encodes opaque navigation IDs; claim/revision stay in cache identity and POST intent. */
export function notesUrl(query: FollowUpNotesQuery): string {
  return `/bff/v1/tenants/${encodeURIComponent(query.tenantId)}/human-follow-ups/${encodeURIComponent(query.workItemId)}/notes`;
}

export function listFollowUpNotes(
  fetch: typeof globalThis.fetch,
  timeout: number,
): FollowUpNotesClient['listNotes'] {
  return (query, signal) =>
    runRead(
      Effect.tryPromise({
        try: (signal) =>
          fetch(notesUrl(query), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json, application/problem+json' },
            signal,
          }),
        catch: (): ResolverFollowUpCaseSummaryFailure => TRANSPORT_FAILURE,
      }).pipe(Effect.flatMap(decodeFollowUpNotes)),
      signal,
      timeout,
      (notes) => ({ ok: true as const, notes }),
    );
}

/** One interruptible append; shared ownership adapter supplies CSRF and timeout policy. */
export function requestFollowUpNote(
  fetch: typeof globalThis.fetch,
  command: AppendFollowUpNoteCommand,
  token: BrowserCsrfToken,
): Effect.Effect<FollowUpNote, FollowUpNoteFailure, never> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(notesUrl(command), {
        method: 'POST',
        credentials: 'same-origin',
        signal,
        headers: {
          Accept: 'application/json, application/problem+json',
          'Content-Type': 'application/json',
          [token.headerName]: token.token,
        },
        body: JSON.stringify({
          noteId: command.noteId,
          claimId: command.claimId,
          expectedOwnershipRevision: command.expectedOwnershipRevision,
          text: command.text,
        }),
      }),
    catch: (): FollowUpNoteFailure => TRANSPORT_FAILURE,
  }).pipe(Effect.flatMap((response) => decodeFollowUpNote(response, command)));
}
