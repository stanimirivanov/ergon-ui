import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunInvocationHistory,
  RunInvocationHistoryQuery,
  RunInvocationHistoryFailure,
} from '../invocation-history-contracts';
import { normalizeExecutionHistoryFailure } from '../bff/run-execution-history-http';
import { runInvocationHistoryApi } from './run-invocation-history-api';
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
export function useRunInvocationHistory(
  query: RunInvocationHistoryQuery | null,
): AssignedRunRead<RunInvocationHistory, RunInvocationHistoryFailure> {
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
    runInvocationHistoryApi.endpoints.getInvocationHistory.useQueryState(
      stable ?? skipToken,
    );
  const start = useCallback(
    (arg: RunInvocationHistoryQuery) =>
      dispatch(
        runInvocationHistoryApi.endpoints.getInvocationHistory.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunInvocationHistoryQuery) =>
      dispatch(
        runInvocationHistoryApi.util.getRunningQueryThunk(
          'getInvocationHistory',
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
