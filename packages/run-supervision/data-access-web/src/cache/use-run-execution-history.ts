import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunExecutionHistory,
  RunExecutionHistoryQuery,
  RunExecutionHistoryFailure,
} from '../execution-history-contracts';
import { normalizeExecutionHistoryFailure } from '../bff/run-execution-history-http';
import { runExecutionHistoryApi } from './run-execution-history-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/**
 * Each opening/recheck requires a distinct protected read, including after a
 * retired same-key pending read. Null retires only this subscription. Only ready
 * exposes RTK data; pending/failure withhold it. Mount beneath the fresh Console
 * gate and retire on context withdrawal; there is no resource copy or polling.
 */
export function useRunExecutionHistory(
  query: RunExecutionHistoryQuery | null,
): AssignedRunRead<RunExecutionHistory, RunExecutionHistoryFailure> {
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
  const state =
    runExecutionHistoryApi.endpoints.getExecutionHistory.useQueryState(
      stable ?? skipToken,
    );
  const start = useCallback(
    (arg: RunExecutionHistoryQuery) =>
      dispatch(
        runExecutionHistoryApi.endpoints.getExecutionHistory.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunExecutionHistoryQuery) =>
      dispatch(
        runExecutionHistoryApi.util.getRunningQueryThunk(
          'getExecutionHistory',
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
    normalizeExecutionHistoryFailure,
  );
}
