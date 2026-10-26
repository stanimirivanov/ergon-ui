import type { FollowUpQuestions } from '@ergon/follow-up-model';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import type {
  FollowUpQuestionsQuery,
  ListFollowUpQuestions,
} from '../client/follow-up-questions';
import { normalizeResolverFollowUpCaseSummaryFailure } from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** Required executable composition, never Redux state; a missing binding becomes a contained defect. */
export interface FollowUpQuestionsCacheDependencies {
  readonly listFollowUpQuestions: ListFollowUpQuestions;
}

/** A private acquisition identity, never sent to the BFF or reused by another mounted inspector. */
export interface QuestionsObservation extends FollowUpQuestionsQuery {
  readonly observation: string;
  readonly attempt: number;
}

export const followUpQuestionsApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
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
