import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  RunControlQuery,
  RunControlObservation,
} from '../control-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { runControlApi } from './run-control-api';
import {
  useFreshAssignedRead,
  type AssignedRunRead,
} from './use-assigned-run-reads';

/** Fresh status after every opening/command. Closing retires only this subscriber; no polling or renewal occurs. */
export function useRunControlRead(
  query: RunControlQuery | null,
): AssignedRunRead<RunControlObservation> {
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
  const state = runControlApi.endpoints.getRunControl.useQueryState(
    stable ?? skipToken,
  );
  const start = useCallback(
    (arg: RunControlQuery) =>
      dispatch(
        runControlApi.endpoints.getRunControl.initiate(arg, {
          forceRefetch: true,
        }),
      ),
    [dispatch],
  );
  const running = useCallback(
    (arg: RunControlQuery) =>
      dispatch(runControlApi.util.getRunningQueryThunk('getRunControl', arg)),
    [dispatch],
  );
  return useFreshAssignedRead(
    stable,
    state,
    start,
    running,
    normalizeRunSupervisionFailure,
  );
}
