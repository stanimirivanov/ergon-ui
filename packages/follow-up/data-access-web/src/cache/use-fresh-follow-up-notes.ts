import type { FollowUpNotes } from '@ergon/follow-up-model';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import { normalizeResolverFollowUpCaseSummaryFailure } from '../client/normalize-human-follow-up-failures';
import { followUpNotesApi } from './follow-up-notes-api';
import type { FollowUpNotesQuery } from '../client/follow-up-notes';

type FollowUpCacheState = {
  readonly humanFollowUpApi: ReturnType<typeof followUpNotesApi.reducer>;
};

/**
 * A mounted fresh-gate projection: pending/failure withhold retained notes;
 * ready references current RTK data rather than a locally captured response.
 */
export type FreshFollowUpNotes =
  | { readonly kind: 'pending' }
  | {
      readonly kind: 'failure';
      readonly failure: ResolverFollowUpCaseSummaryFailure;
      readonly retry: () => void;
    }
  | {
      readonly kind: 'ready';
      readonly notes: FollowUpNotes;
      readonly refresh: () => void;
    };

interface DisclosureGate {
  readonly key: string;
  readonly attempt: number;
  readonly settled: boolean;
}

/**
 * Owns one mounted disclosure's fresh notes subscription.
 *
 * Reopening waits for a pre-existing exact-key read to retire, then starts a
 * distinct BFF gate. Pending and failed checks never disclose retained notes.
 * Only lifecycle coordinates are local: resources stay in RTK Query. Cleanup
 * unsubscribes rather than aborting a request another active reader may share;
 * the zero-grace cache policy retires the request after its last reader leaves.
 * A retry is an explicit new gate, not an automatic replay.
 */
export function useFreshFollowUpNotes(
  query: FollowUpNotesQuery,
): FreshFollowUpNotes {
  const dispatch =
    useDispatch<ThunkDispatch<FollowUpCacheState, unknown, UnknownAction>>();
  const { tenantId, workItemId, claimId, expectedOwnershipRevision } = query;
  const key = JSON.stringify([
    tenantId,
    workItemId,
    claimId,
    expectedOwnershipRevision,
  ]);
  const [attempt, setAttempt] = useState(0);
  const [gate, setGate] = useState<DisclosureGate>();
  const result = followUpNotesApi.endpoints.followUpNotes.useQueryState(query);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const requestQuery = {
      tenantId,
      workItemId,
      claimId,
      expectedOwnershipRevision,
    };

    async function acquire(): Promise<void> {
      // StrictMode discards its first effect setup before this microtask. Do not
      // acquire a throwaway network request for that abandoned lifetime.
      await Promise.resolve();
      if (!active) return;
      // forceRefetch cannot override RTK's same-key pending deduplication.
      // Do not subscribe to the retiring request: that would extend its lifetime.
      let retiring = dispatch(
        followUpNotesApi.util.getRunningQueryThunk(
          'followUpNotes',
          requestQuery,
        ),
      );
      while (retiring !== undefined) {
        await retiring;
        if (!active) return;
        retiring = dispatch(
          followUpNotesApi.util.getRunningQueryThunk(
            'followUpNotes',
            requestQuery,
          ),
        );
      }
      if (!active) return;
      const request = dispatch(
        followUpNotesApi.endpoints.followUpNotes.initiate(requestQuery, {
          forceRefetch: true,
        }),
      );
      unsubscribe = request.unsubscribe;
      setGate({ key, attempt, settled: false });
      await request;
      if (active) {
        setGate({ key, attempt, settled: true });
      }
    }

    void acquire();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [
    dispatch,
    tenantId,
    workItemId,
    claimId,
    expectedOwnershipRevision,
    key,
    attempt,
  ]);

  if (
    gate?.key !== key ||
    gate.attempt !== attempt ||
    !gate.settled ||
    result.isUninitialized ||
    result.isFetching
  ) {
    return { kind: 'pending' };
  }
  // After the mount's gate settles, another active reader may refresh the same
  // cache. Its current pending/failure state also overrides any retained data.
  if (result.isError || result.currentData === undefined) {
    return {
      kind: 'failure',
      failure: normalizeResolverFollowUpCaseSummaryFailure(result.error),
      retry: () => setAttempt((current) => current + 1),
    };
  }
  return {
    kind: 'ready',
    notes: result.currentData,
    refresh: () => setAttempt((current) => current + 1),
  };
}
