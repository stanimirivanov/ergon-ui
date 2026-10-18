import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunCancellationFailure,
  RunCancellationReview,
  RunCancellationReviewQuery,
} from '../cancellation-contracts';
import { normalizeRunCancellationFailure } from '../bff/run-cancellation-http';
import { runCancellationApi } from './run-cancellation-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/** Every opening rechecks authority after older same-key reads settle. Closing retires this subscription only; no private observation is copied locally. */
export function useRunCancellationReview(
  query: RunCancellationReviewQuery | null,
): AssignedRunRead<RunCancellationReview, RunCancellationFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const expectedSupervisionRevision = query?.expectedSupervisionRevision;
  const expectedRunVersion = query?.expectedRunVersion;
  const stable = useMemo(
    (): RunCancellationReviewQuery | null =>
      tenantId === undefined ||
      runId === undefined ||
      expectedSupervisionRevision === undefined ||
      expectedRunVersion === undefined
        ? null
        : { tenantId, runId, expectedSupervisionRevision, expectedRunVersion },
    [tenantId, runId, expectedSupervisionRevision, expectedRunVersion],
  );
  const state =
    runCancellationApi.endpoints.getRunCancellationReview.useQueryState(
      stable ?? skipToken,
    );
  const start = useCallback(
    (arg: RunCancellationReviewQuery) =>
      dispatch(
        runCancellationApi.endpoints.getRunCancellationReview.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunCancellationReviewQuery) =>
      dispatch(
        runCancellationApi.util.getRunningQueryThunk(
          'getRunCancellationReview',
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
    normalizeRunCancellationFailure,
  );
}
