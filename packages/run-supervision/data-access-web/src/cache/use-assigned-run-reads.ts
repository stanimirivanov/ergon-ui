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

/**
 * A fresh-disclosure gate, not a second resource cache. Only `ready` exposes the
 * current RTK-owned projection. Pending/failed phases suppress retained data.
 */
export type AssignedRunRead<T> = (
  | { readonly phase: 'closed' }
  | { readonly phase: 'pending'; readonly hasRetainedData: boolean }
  | { readonly phase: 'ready'; readonly data: T }
  | { readonly phase: 'failed'; readonly error: RunSupervisionFailure }
) & { readonly recheck: () => void };

type CacheDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

/**
 * Acquires a fresh assigned-discovery read after the caller's render commits.
 * Rechecking immediately closes this hook's gate before starting I/O. A retired
 * subscriber never aborts a request still owned by another subscriber; RTK's
 * zero-grace eviction owns last-reader cancellation. No page is copied locally.
 */
export function useAssignedRunDiscovery(
  query: AssignedRunQuery,
): AssignedRunRead<AssignedRunPage> {
  const dispatch = useDispatch<CacheDispatch>();
  const { tenantId, limit, cursor } = query;
  const assignedAt = cursor?.assignedAt;
  const assignmentId = cursor?.assignmentId;
  const stableQuery = useMemo(
    (): AssignedRunQuery => ({
      tenantId,
      ...(limit === undefined ? {} : { limit }),
      ...(assignedAt === undefined || assignmentId === undefined
        ? {}
        : { cursor: { assignedAt, assignmentId } }),
    }),
    [tenantId, limit, assignedAt, assignmentId],
  );
  const state =
    runSupervisionApi.endpoints.listAssignedRuns.useQueryState(stableQuery);
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
  return useFreshAssignedRead(stableQuery, state, start, running);
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
  return useFreshAssignedRead(stableQuery, state, start, running);
}

interface ReadHandle extends PromiseLike<unknown> {
  readonly unsubscribe: () => void;
}

interface ReadState<T> {
  readonly currentData?: T | undefined;
  readonly isFetching: boolean;
  readonly error?: unknown;
}

function useFreshAssignedRead<T, Q>(
  query: Q | null,
  state: ReadState<T>,
  start: (query: Q) => ReadHandle,
  running: (query: Q) => PromiseLike<unknown> | undefined,
): AssignedRunRead<T> {
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
      error: normalizeRunSupervisionFailure(state.error),
      recheck,
    };
  }
  if (state.currentData === undefined)
    return { phase: 'pending', hasRetainedData: false, recheck };
  return { phase: 'ready', data: state.currentData, recheck };
}
