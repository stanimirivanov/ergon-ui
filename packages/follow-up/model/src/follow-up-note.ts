/**
 * Immutable internal commentary attributed to the claim that authored it.
 * Neither text nor historical attribution establishes evidence or current authority.
 */
export interface FollowUpNote {
  readonly noteId: string;
  readonly claimId: string;
  readonly ownershipRevision: number;
  readonly authorActorId: string;
  readonly text: string;
  readonly authoredAt: string;
  readonly recordedAt: string;
}

/** Latest 100 notes, newest recorded time/ID first; truncated omits older history. */
export interface FollowUpNotes {
  readonly items: readonly FollowUpNote[];
  readonly truncated: boolean;
}

/**
 * Mirrors the backend text constraint without trimming or Unicode normalization.
 * Counts Unicode code points, not UTF-16 units. Kotlin blankness includes NBSP
 * and the Unicode space separators but not the JavaScript-only BOM whitespace.
 */
export function isFollowUpNoteText(text: string): boolean {
  const characters = Array.from(text);
  return (
    characters.length >= 1 &&
    characters.length <= 4_000 &&
    characters.some((character) => {
      const unit = character.charCodeAt(0);
      return (
        !/[\p{Z}\t\n\v\f\r]/u.test(character) && !(unit >= 0x1c && unit <= 0x1f)
      );
    }) &&
    !text.includes('\u0000') &&
    !/[\ud800-\udfff]/u.test(text)
  );
}
