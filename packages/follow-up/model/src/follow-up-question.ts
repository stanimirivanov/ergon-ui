/**
 * Historical question attribution, never delivery, an answer, evidence or continuing ownership.
 * UTC instant strings distinguish the server's request time from database recording;
 * neither timestamp establishes when a requester received or read the question.
 */
export interface FollowUpQuestion {
  readonly requestId: string;
  readonly caseId: string;
  readonly claimId: string;
  readonly ownershipRevision: number;
  readonly authorActorId: string;
  readonly question: string;
  readonly requestedAt: string;
  readonly recordedAt: string;
}

/** Newest recorded time/UUID first, at most 100 items; truncation omits older history. */
export interface FollowUpQuestions {
  readonly items: readonly FollowUpQuestion[];
  readonly truncated: boolean;
}

/** Exact, nonblank 1–4000 Unicode code points; Kotlin whitespace rules, no NUL or unpaired surrogate. */
export function isFollowUpQuestionText(text: string): boolean {
  const characters = Array.from(text);
  return (
    characters.length <= 4000 &&
    characters.some((character) => {
      const code = character.charCodeAt(0);
      return (
        !/[\p{Z}\t\n\v\f\r]/u.test(character) && !(code >= 0x1c && code <= 0x1f)
      );
    }) &&
    !text.includes('\u0000') &&
    !/[\ud800-\udfff]/u.test(text)
  );
}
