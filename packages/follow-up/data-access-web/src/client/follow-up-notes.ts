import type { FollowUpNote, FollowUpNotes } from '@ergon/follow-up-model';
import type {
  HumanFollowUpCommandFailure,
  ResolverFollowUpCaseSummaryFailure,
} from './human-follow-up-failures';

/** Exact current claim coordinates partition private cache lifetimes, not authority. */
export interface FollowUpNotesQuery {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
}

/**
 * Immutable append/replay intent. Reuse every field after uncertainty; never mint
 * another note ID or alter text to replay. Author and timestamps are server-owned.
 */
export interface AppendFollowUpNoteCommand extends FollowUpNotesQuery {
  readonly noteId: string;
  readonly text: string;
}

export type FollowUpNoteFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'not-found' }
  | { readonly kind: 'note-conflict' }
  | { readonly kind: 'invalid-note' };

/** Explicit read/append outcomes exclude raw response bodies and browser causes. */
export interface FollowUpNotesClient {
  /** Current-owner read, bounded retry and cancellation; never a lasting access grant. */
  listNotes(
    query: FollowUpNotesQuery,
    signal: AbortSignal,
  ): Promise<
    | { readonly ok: true; readonly notes: FollowUpNotes }
    | { readonly ok: false; readonly error: ResolverFollowUpCaseSummaryFailure }
  >;
  /** One CSRF-protected POST, no automatic replay; rejection can leave the write uncertain. */
  appendNote(
    command: AppendFollowUpNoteCommand,
    signal: AbortSignal,
  ): Promise<
    | { readonly ok: true; readonly note: FollowUpNote }
    | { readonly ok: false; readonly error: FollowUpNoteFailure }
  >;
}
