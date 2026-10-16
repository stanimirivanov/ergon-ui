import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import type {
  AssignedRunConsole,
  AssignedRunConsoleQuery,
  AssignedRunPage,
  AssignedRunQuery,
  RunSupervisionFailure,
} from '../contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { runSupervisionApi } from './run-supervision-api';
import { normalizeRunHandoverFailure } from '../normalize-run-handover-failure';
import type {
  RunSupervisorCandidatePage,
  RunSupervisorCandidateQuery,
  RunSupervisorHandoverFailure,
} from '../handover-contracts';

/**
 * A fresh-disclosure gate, not a second resource cache. Only `ready` exposes the
 * current RTK-owned projection. Pending/failed phases suppress retained data.
 */
export type AssignedRunRead<T, Failure = RunSupervisionFailure> = (
  | { readonly phase: 'closed' }
  | { readonly phase: 'pending'; readonly hasRetainedData: boolean }
  | { readonly phase: 'ready'; readonly data: T }
  | { readonly phase: 'failed'; readonly error: Failure }
) & { readonly recheck: () => void };

type CacheDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

/**
 * Acquires a fresh assigned-discovery read after the caller's render commits.
 * Rechecking immediately closes this hook's gate before starting I/O. A retired
 * subscriber never aborts a request still owned by another subscriber; RTK's
 * zero-grace eviction owns last-reader cancellation. No page is copied locally.
 * A null query closes disclosure and retires this subscription, including during
 * an uncertain handover; retained RTK data is not evidence of current membership.
 */
export function useAssignedRunDiscovery(
  query: AssignedRunQuery | null,
): AssignedRunRead<AssignedRunPage> {
  const dispatch = useDispatch<CacheDispatch>();
  const tenantId = query?.tenantId;
  const limit = query?.limit;
  const cursor = query?.cursor;
  const assignedAt = cursor?.assignedAt;
  const assignmentId = cursor?.assignmentId;
  const stableQuery = useMemo(
    (): AssignedRunQuery | null =>
      tenantId === undefined
        ? null
        : {
            tenantId,
            ...(limit === undefined ? {} : { limit }),
            ...(assignedAt === undefined || assignmentId === undefined
              ? {}
              : { cursor: { assignedAt, assignmentId } }),
          },
    [tenantId, limit, assignedAt, assignmentId],
  );
  const state = runSupervisionApi.endpoints.listAssignedRuns.useQueryState(
    stableQuery ?? skipToken,
  );
  const start = useCallback(
    (arg: AssignedRunQuery) =>
      dispatch(
        runSupervisionApi.endpoints.listAssignedRuns.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: AssignedRunQuery) =>
      dispatch(
        runSupervisionApi.util.getRunningQueryThunk('listAssignedRuns', arg),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(
    stableQuery,
    state,
    start,
    running,
    normalizeRunSupervisionFailure,
  );
}

/**
 * Gates exact tenant/run disclosure independently of discovery membership.
 * `null` retires this subscriber and hides detail. Reopening waits for any
 * pre-existing same-key pending request to settle, then starts a distinct BFF
 * check; it cannot disclose the pre-close result through RTK deduplication.
 * Other active readers may finish their shared request normally. StrictMode's
 * abandoned effect acquires no request. Terminal snapshots use the same gate.
 */
export function useAssignedRunDisclosure(
  query: AssignedRunConsoleQuery | null,
): AssignedRunRead<AssignedRunConsole> {
  const dispatch = useDispatch<CacheDispatch>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const stableQuery = useMemo(
    (): AssignedRunConsoleQuery | null =>
      tenantId === undefined || runId === undefined
        ? null
        : { tenantId, runId },
    [tenantId, runId],
  );
  const state = runSupervisionApi.endpoints.getAssignedRunConsole.useQueryState(
    stableQuery ?? skipToken,
  );
  const start = useCallback(
    (arg: AssignedRunConsoleQuery) =>
      dispatch(
        runSupervisionApi.endpoints.getAssignedRunConsole.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: AssignedRunConsoleQuery) =>
      dispatch(
        runSupervisionApi.util.getRunningQueryThunk(
          'getAssignedRunConsole',
          arg,
        ),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(
    stableQuery,
    state,
    start,
    running,
    normalizeRunSupervisionFailure,
  );
}

/**
 * Fresh private recipient discovery tied to tenant/run/epoch/cursor. Closing or
 * a failed access recheck retires identities; reopening cannot reuse a pending
 * pre-close response. It shares the same proven subscriber-retirement mechanism
 * as Console reads, not another resource cache.
 */
export function useRunSupervisorCandidates(
  query: RunSupervisorCandidateQuery | null,
): AssignedRunRead<RunSupervisorCandidatePage, RunSupervisorHandoverFailure> {
  const dispatch = useDispatch<CacheDispatch>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const expectedSupervisionRevision = query?.expectedSupervisionRevision;
  const limit = query?.limit;
  const afterActorId = query?.afterActorId;
  const stableQuery = useMemo(
    (): RunSupervisorCandidateQuery | null =>
      tenantId === undefined ||
      runId === undefined ||
      expectedSupervisionRevision === undefined
        ? null
        : {
            tenantId,
            runId,
            expectedSupervisionRevision,
            ...(limit === undefined ? {} : { limit }),
            ...(afterActorId === undefined ? {} : { afterActorId }),
          },
    [tenantId, runId, expectedSupervisionRevision, limit, afterActorId],
  );
  const state =
    runSupervisionApi.endpoints.listRunHandoverCandidates.useQueryState(
      stableQuery ?? skipToken,
    );
  const start = useCallback(
    (arg: RunSupervisorCandidateQuery) =>
      dispatch(
        runSupervisionApi.endpoints.listRunHandoverCandidates.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunSupervisorCandidateQuery) =>
      dispatch(
        runSupervisionApi.util.getRunningQueryThunk(
          'listRunHandoverCandidates',
          arg,
        ),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(
    stableQuery,
    state,
    start,
    running,
    normalizeRunHandoverFailure,
  );
}

interface ReadHandle extends PromiseLike<unknown> {
  readonly unsubscribe: () => void;
}

interface ReadState<T> {
  readonly currentData?: T | undefined;
  readonly isFetching: boolean;
  readonly error?: unknown;
}

export function useFreshAssignedRead<T, Q, Failure>(
  query: Q | null,
  state: ReadState<T>,
  start: (query: Q) => ReadHandle,
  running: (query: Q) => PromiseLike<unknown> | undefined,
  normalizeFailure: (value: unknown) => Failure,
): AssignedRunRead<T, Failure> {
  const [generation, setGeneration] = useState(0);
  const [accepted, setAccepted] = useState<{
    readonly query: Q;
    readonly generation: number;
  } | null>(null);
  const recheck = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    if (query === null) return;
    let isCurrent = true;
    let request: ReadHandle | undefined;
    // Acquisition follows a committed closed gate. Awaiting a running exact-key
    // request prevents forceRefetch from joining a pre-retirement pending read.
    // RTK owns whether that shared request completes or is last-reader aborted.
    void Promise.resolve().then(async () => {
      if (!isCurrent) return;
      let pending = running(query);
      while (pending !== undefined) {
        await pending;
        if (!isCurrent) return;
        pending = running(query);
      }
      if (!isCurrent) return;
      request = start(query);
      await request;
      if (isCurrent) setAccepted({ query, generation });
    });
    return () => {
      isCurrent = false;
      request?.unsubscribe();
    };
  }, [query, generation, start, running]);

  if (query === null) return { phase: 'closed', recheck };
  if (
    accepted?.query !== query ||
    accepted.generation !== generation ||
    state.isFetching
  ) {
    return {
      phase: 'pending',
      hasRetainedData: state.currentData !== undefined,
      recheck,
    };
  }
  if (state.error !== undefined) {
    return {
      phase: 'failed',
      error: normalizeFailure(state.error),
      recheck,
    };
  }
  if (state.currentData === undefined)
    return { phase: 'pending', hasRetainedData: false, recheck };
  return { phase: 'ready', data: state.currentData, recheck };
}
