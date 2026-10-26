import { isFollowUpQuestionText } from '@ergon/follow-up-model';
import { Schema } from 'effect';

const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => Number.isFinite(Date.parse(value))),
);

/** Shared immutable receipt shape for bounded history and exact command acknowledgement. */
export const followUpQuestionSchema = Schema.Struct({
  requestId: Schema.UUID,
  caseId: Schema.UUID,
  claimId: Schema.UUID,
  ownershipRevision: Schema.Int.pipe(
    Schema.between(1, Number.MAX_SAFE_INTEGER),
  ),
  authorActorId: Schema.UUID,
  question: Schema.String.pipe(Schema.filter(isFollowUpQuestionText)),
  requestedAt: instant,
  recordedAt: instant,
});
