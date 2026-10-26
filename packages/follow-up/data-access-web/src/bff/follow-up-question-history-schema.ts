import { isFollowUpQuestionText } from '@ergon/follow-up-model';
import { Schema } from 'effect';
import { followUpQuestionSchema } from './follow-up-question-schema';

const answerInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter((value) => {
    const time = Date.parse(value);
    return (
      Number.isFinite(time) &&
      new Date(time).toISOString().slice(0, 19) === value.slice(0, 19)
    );
  }),
);

// Answers share the backend question's exact Unicode/text constraints, but not its receipt contract.
const recordedAnswer = Schema.Struct({
  responseId: Schema.UUID,
  answer: Schema.String.pipe(Schema.filter(isFollowUpQuestionText)),
  respondedAt: answerInstant,
  recordedAt: answerInstant,
});

/** Read-only extension: preserve legacy omission separately from a checked, explicitly unanswered question. */
export const followUpQuestionHistorySchema = Schema.extend(
  followUpQuestionSchema,
  Schema.Struct({
    response: Schema.optionalWith(Schema.NullOr(recordedAnswer), {
      exact: true,
    }),
  }),
);
