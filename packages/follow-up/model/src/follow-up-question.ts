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

/** Exact untrusted answer text; command time and database recording time are not delivery or proof. */
export interface RecordedRequesterAnswer {
  readonly responseId: string;
  readonly answer: string;
  readonly respondedAt: string;
  readonly recordedAt: string;
}

/** History only: omission means an older server; null means no answer in this checked snapshot. */
export interface FollowUpQuestionHistoryItem extends FollowUpQuestion {
  readonly response?: RecordedRequesterAnswer | null;
}

/** Newest question recorded time/UUID first, at most 100 items; answers never reorder the page. */
export interface FollowUpQuestions {
  readonly items: readonly FollowUpQuestionHistoryItem[];
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
