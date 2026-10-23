import {
  isFollowUpNoteText,
  type FollowUpNote,
  type FollowUpNotes,
} from '@ergon/follow-up-model';
import { Effect, Schema } from 'effect';
import type {
  AppendFollowUpNoteCommand,
  FollowUpNoteFailure,
} from '../client/follow-up-notes';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import {
  INVALID_RESPONSE,
  mapCsrfHttpFailure,
  mapReadHttpFailure,
} from './follow-up-failures';
import { readJson, readOptionalProblem } from './json-response';

const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => Number.isFinite(Date.parse(value))),
);
const noteSchema = Schema.Struct({
  noteId: Schema.UUID,
  claimId: Schema.UUID,
  ownershipRevision: Schema.Int.pipe(
    Schema.between(1, Number.MAX_SAFE_INTEGER),
  ),
  authorActorId: Schema.UUID,
  text: Schema.String.pipe(Schema.filter(isFollowUpNoteText)),
  authoredAt: instant,
  recordedAt: instant,
});
const historySchema = Schema.Struct({
  items: Schema.Array(noteSchema).pipe(Schema.maxItems(100)),
  truncated: Schema.Boolean,
});
const NOTE_PROBLEMS = new Map<string, FollowUpNoteFailure>([
  [
    '404:urn:ergon:problem:human-follow-up-notes-not-found',
    { kind: 'not-found' },
  ],
  [
    '409:urn:ergon:problem:human-follow-up-note-conflict',
    { kind: 'note-conflict' },
  ],
  [
    '400:urn:ergon:problem:invalid-human-follow-up-note',
    { kind: 'invalid-note' },
  ],
]);

/** Validates bounded history, uniqueness and PostgreSQL's descending time/UUID order. */
export function decodeFollowUpNotes(
  response: Response,
): Effect.Effect<FollowUpNotes, ResolverFollowUpCaseSummaryFailure, never> {
  if (response.status !== 200) {
    return readOptionalProblem(response).pipe(
      Effect.flatMap((problem) =>
        Effect.fail(
          response.status === 404 &&
            problem?.type ===
              'urn:ergon:problem:human-follow-up-notes-not-found'
            ? { kind: 'not-found' as const }
            : mapReadHttpFailure(response.status, problem),
        ),
      ),
    );
  }
  return readJson(response).pipe(
    Effect.flatMap(Schema.decodeUnknown(historySchema)),
    Effect.filterOrFail(
      (history) =>
        (!history.truncated || history.items.length === 100) &&
        new Set(history.items.map((note) => note.noteId.toLowerCase())).size ===
          history.items.length &&
        history.items.every((note, index) => {
          const previous = history.items[index - 1];
          return previous === undefined || orderKey(previous) > orderKey(note);
        }),
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}

/** Both initial append and replay must echo the exact immutable intent. */
export function decodeFollowUpNote(
  response: Response,
  command: AppendFollowUpNoteCommand,
): Effect.Effect<FollowUpNote, FollowUpNoteFailure, never> {
  if (response.status !== 200 && response.status !== 201) {
    return readOptionalProblem(response).pipe(
      Effect.flatMap((problem) =>
        Effect.fail(
          NOTE_PROBLEMS.get(`${response.status}:${problem?.type}`) ??
            mapCsrfHttpFailure(response.status, problem),
        ),
      ),
    );
  }
  return readJson(response).pipe(
    Effect.flatMap(Schema.decodeUnknown(noteSchema)),
    Effect.filterOrFail(
      (note) =>
        note.noteId === command.noteId &&
        note.claimId === command.claimId &&
        note.ownershipRevision === command.expectedOwnershipRevision &&
        note.text === command.text,
      () => INVALID_RESPONSE,
    ),
    Effect.mapError(() => INVALID_RESPONSE),
  );
}

function orderKey(note: FollowUpNote): string {
  const [seconds = '', fraction = ''] = note.recordedAt.slice(0, -1).split('.');
  return `${seconds}.${fraction.padEnd(9, '0')}:${note.noteId.toLowerCase()}`;
}
