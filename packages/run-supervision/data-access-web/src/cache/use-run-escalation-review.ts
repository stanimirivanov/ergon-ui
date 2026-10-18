import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunEscalationFailure,
  RunEscalationReview,
  RunEscalationReviewQuery,
} from '../escalation-contracts';
import { normalizeRunEscalationFailure } from '../bff/run-escalation-http';
import { runEscalationApi } from './run-escalation-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/** Every opening rechecks authority after older same-key reads settle. Closing retires this subscription only; no private observation is copied locally. */
export function useRunEscalationReview(
  query: RunEscalationReviewQuery | null,
): AssignedRunRead<RunEscalationReview, RunEscalationFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId;
  const runId = query?.runId;
  const expectedSupervisionRevision = query?.expectedSupervisionRevision;
  const expectedRunVersion = query?.expectedRunVersion;
  const stable = useMemo(
    (): RunEscalationReviewQuery | null =>
      tenantId === undefined ||
      runId === undefined ||
      expectedSupervisionRevision === undefined ||
      expectedRunVersion === undefined
        ? null
        : { tenantId, runId, expectedSupervisionRevision, expectedRunVersion },
    [tenantId, runId, expectedSupervisionRevision, expectedRunVersion],
  );
  const state = runEscalationApi.endpoints.getRunEscalationReview.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunEscalationReviewQuery) =>
      dispatch(
        runEscalationApi.endpoints.getRunEscalationReview.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunEscalationReviewQuery) =>
      dispatch(
        runEscalationApi.util.getRunningQueryThunk(
          'getRunEscalationReview',
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
    normalizeRunEscalationFailure,
  );
}
