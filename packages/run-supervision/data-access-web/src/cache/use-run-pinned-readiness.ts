import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunPinnedReadiness,
  RunPinnedReadinessQuery,
  RunPinnedReadinessFailure,
} from '../pinned-readiness-contracts';
import { normalizeInspectionFailure } from '../bff/run-inspection-http';
import { runPinnedReadinessApi } from './run-pinned-readiness-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

const normalizeFailure = (value: unknown): RunPinnedReadinessFailure =>
  normalizeInspectionFailure(value, 'readiness-unsupported');

/** Each opening/recheck obtains a distinct protected observation after older same-key work settles. Null retires only this subscription; parent withdrawal must unmount it. Pending/failed reads expose no retained data. */
export function useRunPinnedReadiness(
  query: RunPinnedReadinessQuery | null,
): AssignedRunRead<RunPinnedReadiness, RunPinnedReadinessFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId,
    runId = query?.runId,
    epoch = query?.expectedSupervisionRevision,
    caseId = query?.caseId,
    caseStreamVersion = query?.caseStreamVersion,
    contractKey = query?.contractKey,
    contractRevision = query?.contractRevision;
  const stable = useMemo(
    () =>
      tenantId === undefined ||
      runId === undefined ||
      epoch === undefined ||
      caseId === undefined ||
      caseStreamVersion === undefined ||
      contractKey === undefined ||
      contractRevision === undefined
        ? null
        : {
            tenantId,
            runId,
            expectedSupervisionRevision: epoch,
            caseId,
            caseStreamVersion,
            contractKey,
            contractRevision,
          },
    [
      tenantId,
      runId,
      epoch,
      caseId,
      caseStreamVersion,
      contractKey,
      contractRevision,
    ],
  );
  const state =
    runPinnedReadinessApi.endpoints.getPinnedReadiness.useQueryState(
      stable ?? skipToken,
    );
  const start = useCallback(
    (arg: RunPinnedReadinessQuery) =>
      dispatch(
        runPinnedReadinessApi.endpoints.getPinnedReadiness.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunPinnedReadinessQuery) =>
      dispatch(
        runPinnedReadinessApi.util.getRunningQueryThunk(
          'getPinnedReadiness',
          arg,
        ),
      ),
    [dispatch],
  );
  return useFreshAssignedRead(stable, state, start, running, normalizeFailure);
}
