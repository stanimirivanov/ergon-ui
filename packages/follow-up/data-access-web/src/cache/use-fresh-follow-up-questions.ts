import type { FollowUpQuestions } from '@ergon/follow-up-model';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useEffect, useId, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { FollowUpQuestionsQuery } from '../client/follow-up-questions';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import { normalizeResolverFollowUpCaseSummaryFailure } from '../client/normalize-human-follow-up-failures';
import { followUpQuestionsApi } from './follow-up-questions-api';

type QuestionsView =
  | { readonly kind: 'pending' }
  | {
      readonly kind: 'failure';
      readonly failure: ResolverFollowUpCaseSummaryFailure;
      readonly refresh: () => void;
    }
  | {
      readonly kind: 'ready';
      readonly questions: FollowUpQuestions;
      readonly refresh: () => void;
    };

/** Each mount/recheck owns a distinct RTK observation, so a retiring read cannot authorize reopening.
 * Only acquisition identity is local; currentData remains the sole resource. Cleanup detaches
 * this subscriber; RTK's zero-grace last-reader policy owns physical cancellation.
 * StrictMode's abandoned setup acquires nothing.
 */
export function useFreshFollowUpQuestions(
  query: FollowUpQuestionsQuery,
): QuestionsView {
  const observation = useId();
  const [attempt, setAttempt] = useState(0);
  const { tenantId, workItemId, caseId, claimId, expectedOwnershipRevision } =
    query;
  const dispatch = useDispatch<
    ThunkDispatch<
      {
        readonly humanFollowUpApi: ReturnType<
          typeof followUpQuestionsApi.reducer
        >;
      },
      unknown,
      UnknownAction
    >
  >();
  const result = followUpQuestionsApi.endpoints.followUpQuestions.useQueryState(
    { ...query, observation, attempt },
  );
  useEffect(() => {
    let active = true;
    let retire: (() => void) | undefined;
    void Promise.resolve().then(() => {
      if (!active) return;
      const request = dispatch(
        followUpQuestionsApi.endpoints.followUpQuestions.initiate({
          tenantId,
          workItemId,
          caseId,
          claimId,
          expectedOwnershipRevision,
          observation,
          attempt,
        }),
      );
      retire = () => {
        request.unsubscribe();
      };
    });
    return () => {
      active = false;
      retire?.();
    };
  }, [
    dispatch,
    tenantId,
    workItemId,
    caseId,
    claimId,
    expectedOwnershipRevision,
    observation,
    attempt,
  ]);
  if (result.isUninitialized || result.isFetching) return { kind: 'pending' };
  const refresh = (): void => setAttempt((value) => value + 1);
  if (result.isError || result.currentData === undefined)
    return {
      kind: 'failure',
      failure: normalizeResolverFollowUpCaseSummaryFailure(result.error),
      refresh,
    };
  return { kind: 'ready', questions: result.currentData, refresh };
}
