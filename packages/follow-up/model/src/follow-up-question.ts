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
