import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunRetrySuccessor,
  RunRetrySuccessorQuery,
  RunRetrySuccessorFailure,
} from '../retry-successor-contracts';
import { normalizeRetrySuccessorFailure } from '../bff/run-retry-successor-http';
import { runRetrySuccessorApi } from './run-retry-successor-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/**
 * Opening/rechecking requires a distinct protected read after older same-key
 * requests settle. Null retires this subscriber, not another reader's request.
 * Only ready exposes RTK data. Mount under the fresh parent Console gate; no
 * resource copy, polling or inherited target authority is retained.
 */
export function useRunRetrySuccessor(
  query: RunRetrySuccessorQuery | null,
): AssignedRunRead<RunRetrySuccessor, RunRetrySuccessorFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId,
    runId = query?.runId,
    epoch = query?.expectedSupervisionRevision;
  const stable = useMemo(
    () =>
      tenantId === undefined || runId === undefined || epoch === undefined
        ? null
        : { tenantId, runId, expectedSupervisionRevision: epoch },
    [tenantId, runId, epoch],
  );
  const state = runRetrySuccessorApi.endpoints.getRetrySuccessor.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunRetrySuccessorQuery) =>
      dispatch(
        runRetrySuccessorApi.endpoints.getRetrySuccessor.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunRetrySuccessorQuery) =>
      dispatch(
        runRetrySuccessorApi.util.getRunningQueryThunk(
          'getRetrySuccessor',
          arg,
        ),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(
    stable,
    state,
    start,
    running,
    normalizeRetrySuccessorFailure,
  );
}
