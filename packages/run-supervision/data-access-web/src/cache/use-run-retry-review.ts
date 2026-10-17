import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunRetryFailure,
  RunRetryReview,
  RunRetryReviewQuery,
} from '../retry-contracts';
import { normalizeRunRetryFailure } from '../bff/run-retry-http';
import { runRetryApi } from './run-retry-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/** Each opening obtains a distinct private review after older same-key reads settle. Closing retires only this subscriber; no review is copied locally. */
export function useRunRetryReview(
  query: RunRetryReviewQuery | null,
): AssignedRunRead<RunRetryReview, RunRetryFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const expectedSupervisionRevision = query?.expectedSupervisionRevision;
  const expectedRunVersion = query?.expectedRunVersion;
  const stable = useMemo(
    (): RunRetryReviewQuery | null =>
      tenantId === undefined ||
      runId === undefined ||
      expectedSupervisionRevision === undefined ||
      expectedRunVersion === undefined
        ? null
        : { tenantId, runId, expectedSupervisionRevision, expectedRunVersion },
    [tenantId, runId, expectedSupervisionRevision, expectedRunVersion],
  );
  const state = runRetryApi.endpoints.getRunRetryReview.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunRetryReviewQuery) =>
      dispatch(
        runRetryApi.endpoints.getRunRetryReview.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunRetryReviewQuery) =>
      dispatch(runRetryApi.util.getRunningQueryThunk('getRunRetryReview', arg)),
    [dispatch],
  );
  return useFreshAssignedRead(
    stable,
    state,
    start,
    running,
    normalizeRunRetryFailure,
  );
}
