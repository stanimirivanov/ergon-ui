import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunExecutionFailure,
  RunExecutionReview,
  RunExecutionReviewQuery,
} from '../execution-command-contracts';
import { normalizeRunExecutionFailure } from '../bff/run-execution-command-http';
import { runExecutionApi } from './run-execution-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/** Fresh eligibility observation for each modal opening; closing retires this subscriber, never another reader's request. Retains no review copy. */
export function useRunExecutionReview(
  query: RunExecutionReviewQuery | null,
): AssignedRunRead<RunExecutionReview, RunExecutionFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const expectedSupervisionRevision = query?.expectedSupervisionRevision;
  const expectedRunVersion = query?.expectedRunVersion;
  const stable = useMemo(
    (): RunExecutionReviewQuery | null =>
      tenantId === undefined ||
      runId === undefined ||
      expectedSupervisionRevision === undefined ||
      expectedRunVersion === undefined
        ? null
        : { tenantId, runId, expectedSupervisionRevision, expectedRunVersion },
    [tenantId, runId, expectedSupervisionRevision, expectedRunVersion],
  );
  const state = runExecutionApi.endpoints.getRunExecutionReview.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunExecutionReviewQuery) =>
      dispatch(
        runExecutionApi.endpoints.getRunExecutionReview.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunExecutionReviewQuery) =>
      dispatch(
        runExecutionApi.util.getRunningQueryThunk('getRunExecutionReview', arg),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(
    stable,
    state,
    start,
    running,
    normalizeRunExecutionFailure,
  );
}
