import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { normalizeProgressFailure, progressApi } from './progress-api';
import type {
  ProgressFailure,
  ProgressQuery,
  RequesterProgress,
} from './progress-client';
import type { RequesterQuestions } from './question-history';

/** Lifecycle view only; ready data remains a reference to the current RTK resource, not a second cache. */
export type ProgressRead =
  | { readonly kind: 'pending' }
  | { readonly kind: 'failure'; readonly failure: ProgressFailure }
  | {
      readonly kind: 'ready';
      readonly progress: RequesterProgress;
      readonly questions: RequesterQuestions;
    };

/**
 * Acquires distinct progress then history reads for each mounted/recheck lifetime.
 * Both must succeed before the private canvas is disclosed; these are independent
 * server snapshots, not an atomic read. Progress failure never starts history.
 * Waits out an older same-key pending read before forced acquisition. Pending
 * and failed gates withhold retained data. Cleanup unsubscribes without aborting
 * another reader; last-reader eviction owns cancellation. No response is copied.
 */
export function useFreshProgress(
  { tenantId, caseId }: ProgressQuery,
  attempt: number,
): ProgressRead {
  const dispatch =
    useDispatch<
      ThunkDispatch<
        { requesterProgressApi: ReturnType<typeof progressApi.reducer> },
        unknown,
        UnknownAction
      >
    >();
  const key = JSON.stringify([tenantId, caseId]);
  const [gate, setGate] = useState<{
    key: string;
    attempt: number;
    settled: boolean;
  }>();
  const result = progressApi.endpoints.progress.useQueryState({
    tenantId,
    caseId,
  });
  const questions = progressApi.endpoints.questions.useQueryState({
    tenantId,
    caseId,
  });
  useEffect(() => {
    let active = true;
    const subscriptions: (() => void)[] = [];
    async function acquire(): Promise<void> {
      await Promise.resolve();
      if (!active) return;
      const query = { tenantId, caseId };
      for (const resource of ['progress', 'questions'] as const) {
        let old = dispatch(
          progressApi.util.getRunningQueryThunk(resource, query),
        );
        while (old !== undefined) {
          await old;
          if (!active) return;
          old = dispatch(
            progressApi.util.getRunningQueryThunk(resource, query),
          );
        }
        if (!active) return;
        const request =
          resource === 'progress'
            ? dispatch(
                progressApi.endpoints.progress.initiate(query, {
                  forceRefetch: true,
                }),
              )
            : dispatch(
                progressApi.endpoints.questions.initiate(query, {
                  forceRefetch: true,
                }),
              );
        subscriptions.push(request.unsubscribe);
        setGate({ key, attempt, settled: false });
        const outcome = await request;
        if (!active) return;
        if (outcome.error !== undefined) break;
      }
      if (active) setGate({ key, attempt, settled: true });
    }
    void acquire();
    return () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [dispatch, tenantId, caseId, key, attempt]);
  if (
    gate?.key !== key ||
    gate.attempt !== attempt ||
    !gate.settled ||
    result.isUninitialized ||
    result.isFetching
  )
    return { kind: 'pending' };
  if (result.isError || result.currentData === undefined)
    return { kind: 'failure', failure: normalizeProgressFailure(result.error) };
  if (questions.isUninitialized || questions.isFetching)
    return { kind: 'pending' };
  if (questions.isError || questions.currentData === undefined)
    return {
      kind: 'failure',
      failure: normalizeProgressFailure(questions.error),
    };
  return {
    kind: 'ready',
    progress: result.currentData,
    questions: questions.currentData,
  };
}
