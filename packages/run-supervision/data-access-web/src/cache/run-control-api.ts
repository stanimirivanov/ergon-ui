import type {
  RunControlClient,
  RunControlCommand,
  RunControlQuery,
  RunControlReceipt,
  RunControlObservation,
} from '../control-contracts';
import type { RunSupervisionClient, RunSupervisionFailure } from '../contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { clientFrom, runSupervisionApi } from './run-supervision-api';

/** Same private RTK owner. Every lifecycle outcome invalidates status; an acknowledgement is historical only. */
export const runControlApi = runSupervisionApi.injectEndpoints({
  endpoints: (build) => ({
    getRunControl: build.query<RunControlObservation, RunControlQuery>({
      keepUnusedDataFor: 0,
      providesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: RunControlObservation } | { error: RunSupervisionFailure }
      > {
        try {
          const result = await controlClient(api.extra).getRunControl(
            query,
            api.signal,
          );
          return result.ok
            ? {
                data: {
                  ...result.value,
                  receivedAtMonotonic: performance.now(),
                },
              }
            : { error: normalizeRunSupervisionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    changeRunControl: build.mutation<RunControlReceipt, RunControlCommand>({
      invalidatesTags: (_data, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        command,
        api,
      ): Promise<
        { data: RunControlReceipt } | { error: RunSupervisionFailure }
      > {
        try {
          const result = await controlClient(api.extra).changeRunControl(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.value }
            : { error: normalizeRunSupervisionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
export const { useChangeRunControlMutation } = runControlApi;

function controlClient(extra: unknown): RunControlClient {
  const client = clientFrom(extra);
  if (isControlClient(client)) return client;
  throw new Error('Run control client is not configured');
}

function isControlClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunControlClient {
  return (
    'getRunControl' in client &&
    typeof client.getRunControl === 'function' &&
    'changeRunControl' in client &&
    typeof client.changeRunControl === 'function'
  );
}
