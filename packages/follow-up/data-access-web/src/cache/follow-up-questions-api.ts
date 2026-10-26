import type {
  FollowUpQuestion,
  FollowUpQuestions,
} from '@ergon/follow-up-model';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import type {
  FollowUpQuestionsQuery,
  ListFollowUpQuestions,
  RecordFollowUpQuestion,
  RecordFollowUpQuestionCommand,
  FollowUpQuestionFailure,
} from '../client/follow-up-questions';
import { normalizeResolverFollowUpCaseSummaryFailure } from '../client/normalize-human-follow-up-failures';
import { normalizeFollowUpQuestionFailure } from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** Required executable composition, never Redux state; a missing binding becomes a contained defect. */
export interface FollowUpQuestionsCacheDependencies {
  readonly listFollowUpQuestions: ListFollowUpQuestions;
  readonly recordFollowUpQuestion: RecordFollowUpQuestion;
}

/** A private acquisition identity, never sent to the BFF or reused by another mounted inspector. */
export interface QuestionsObservation extends FollowUpQuestionsQuery {
  readonly observation: string;
  readonly attempt: number;
}

/** Private observations and exact recording share the existing API/store. No optimistic
 * patch or receipt-based authority: callers reacquire history after acknowledgement.
 * The mounted command owner must reset its mutation result when retiring.
 */
export const followUpQuestionsApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
    recordFollowUpQuestion: build.mutation<
      FollowUpQuestion,
      RecordFollowUpQuestionCommand
    >({
      queryFn: (
        command,
        api,
      ): Promise<
        { data: FollowUpQuestion } | { error: FollowUpQuestionFailure }
      > =>
        executeFollowUpQuery(
          () => questionWriter(api.extra)(command, api.signal),
          (result) =>
            result.ok
              ? { data: result.question }
              : { error: normalizeFollowUpQuestionFailure(result.error) },
        ),
    }),
    followUpQuestions: build.query<FollowUpQuestions, QuestionsObservation>({
      keepUnusedDataFor: 0,
      queryFn: (
        query,
        api,
      ): Promise<
        | { data: FollowUpQuestions }
        | { error: ResolverFollowUpCaseSummaryFailure }
      > =>
        executeFollowUpQuery(
          () => questionReader(api.extra)(query, api.signal),
          (result) =>
            result.ok
              ? { data: result.questions }
              : {
                  error: normalizeResolverFollowUpCaseSummaryFailure(
                    result.error,
                  ),
                },
        ),
    }),
  }),
});

function questionWriter(extra: unknown): RecordFollowUpQuestion {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'recordFollowUpQuestion' in extra &&
    typeof extra.recordFollowUpQuestion === 'function'
  )
    return extra.recordFollowUpQuestion as RecordFollowUpQuestion;
  throw new Error('Question recording is not configured');
}

function questionReader(extra: unknown): ListFollowUpQuestions {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'listFollowUpQuestions' in extra &&
    typeof extra.listFollowUpQuestions === 'function'
  )
    return extra.listFollowUpQuestions as ListFollowUpQuestions;
  throw new Error('Question history is not configured');
}
