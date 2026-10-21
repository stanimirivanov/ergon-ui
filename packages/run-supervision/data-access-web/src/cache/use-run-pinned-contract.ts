import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunPinnedContract,
  RunPinnedContractQuery,
  RunPinnedContractFailure,
} from '../pinned-contract-contracts';
import { normalizePinnedContractFailure } from '../bff/run-pinned-contract-http';
import { runPinnedContractApi } from './run-pinned-contract-api';
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
export function useRunPinnedContract(
  query: RunPinnedContractQuery | null,
): AssignedRunRead<RunPinnedContract, RunPinnedContractFailure> {
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  const tenantId = query?.tenantId,
    runId = query?.runId,
    epoch = query?.expectedSupervisionRevision,
    contractKey = query?.contractKey,
    contractRevision = query?.contractRevision,
    stepId = query?.stepId,
    capability = query?.capability;
  const stable = useMemo(
    () =>
      tenantId === undefined ||
      runId === undefined ||
      epoch === undefined ||
      contractKey === undefined ||
      contractRevision === undefined ||
      stepId === undefined ||
      capability === undefined
        ? null
        : {
            tenantId,
            runId,
            expectedSupervisionRevision: epoch,
            contractKey,
            contractRevision,
            stepId,
            capability,
          },
    [tenantId, runId, epoch, contractKey, contractRevision, stepId, capability],
  );
  const state = runPinnedContractApi.endpoints.getPinnedContract.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunPinnedContractQuery) =>
      dispatch(
        runPinnedContractApi.endpoints.getPinnedContract.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunPinnedContractQuery) =>
      dispatch(
        runPinnedContractApi.util.getRunningQueryThunk(
          'getPinnedContract',
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
    normalizePinnedContractFailure,
  );
}
