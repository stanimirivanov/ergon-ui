import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { normalizeProgressFailure, progressApi } from './progress-api';
import type {
  ProgressFailure,
  ProgressQuery,
  RequesterProgress,
} from './progress-client';

/** Lifecycle view only; ready data remains a reference to the current RTK resource, not a second cache. */
export type ProgressRead =
  | { readonly kind: 'pending' }
  | { readonly kind: 'failure'; readonly failure: ProgressFailure }
  | { readonly kind: 'ready'; readonly progress: RequesterProgress };

/**
 * Acquires a distinct authorization read for each mounted/recheck lifetime.
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
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function acquire(): Promise<void> {
      await Promise.resolve();
      if (!active) return;
      const query = { tenantId, caseId };
      let old = dispatch(
        progressApi.util.getRunningQueryThunk('progress', query),
      );
      while (old !== undefined) {
        await old;
        if (!active) return;
        old = dispatch(
          progressApi.util.getRunningQueryThunk('progress', query),
        );
      }
      if (!active) return;
      const request = dispatch(
        progressApi.endpoints.progress.initiate(query, { forceRefetch: true }),
      );
      unsubscribe = request.unsubscribe;
      setGate({ key, attempt, settled: false });
      await request;
      if (active) setGate({ key, attempt, settled: true });
    }
    void acquire();
    return () => {
      active = false;
      unsubscribe?.();
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
  return { kind: 'ready', progress: result.currentData };
}
