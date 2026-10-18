import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  AssignedRunConsole,
  AssignedRunConsoleQuery,
  AssignedRunPage,
  AssignedRunQuery,
  RunSupervisionClient,
  RunSupervisionFailure,
} from '../contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { normalizeRunHandoverFailure } from '../normalize-run-handover-failure';
import { normalizeRunApprovalFailure } from '../bff/run-approval-http';
import { normalizeRunProofFinalizationFailure } from '../bff/run-proof-finalization-http';
import type { RunExecutionFailure } from '../execution-command-contracts';
import type { RunRetryFailure } from '../retry-contracts';
import type { RunEscalationFailure } from '../escalation-contracts';
import type { RunCancellationFailure } from '../cancellation-contracts';
import type {
  RunProofFinalizationClient,
  RunProofFinalizationCommand,
  RunProofFinalizationReceipt,
  RunProofFinalizationFailure,
} from '../proof-finalization-contracts';
import type {
  RunApprovalClient,
  RunApprovalCommand,
  RunApprovalFailure,
  RunApprovalReceipt,
} from '../approval-contracts';
import type {
  RunSupervisorCandidatePage,
  RunSupervisorCandidateQuery,
  RunSupervisorHandoverClient,
  RunSupervisorHandoverCommand,
  RunSupervisorHandoverFailure,
  RunSupervisorHandoverReceipt,
} from '../handover-contracts';

/** Executable thunk-extra binding supplied by the app; never put the client in Redux state. */
export interface RunSupervisionDependencies {
  readonly runSupervision: RunSupervisionClient;
}

/**
 * Remote read cache keyed by the complete tenant/query or tenant/run identity.
 *
 * Both projections are evicted after their final subscriber leaves; reopening
 * must revalidate current server assignment/authority rather than revive a
 * retained private snapshot. RTK cancellation reaches the injected client.
 * Client rejections and missing bindings become a cause-free unexpected-defect
 * before RTK can log or serialize them; these endpoints never relabel a rejected
 * client as cancellation just because its signal reports aborted. RTK's own
 * cancellation race can settle before the endpoint returns its safe result.
 * Register this reducer and middleware in the store and supply its dependencies.
 */
export const runSupervisionApi = createApi({
  reducerPath: 'runSupervisionApi',
  baseQuery: fakeBaseQuery<
    | RunSupervisorHandoverFailure
    | RunApprovalFailure
    | RunProofFinalizationFailure
    | RunExecutionFailure
    | RunRetryFailure
    | RunEscalationFailure
    | RunCancellationFailure
  >(),
  tagTypes: ['AssignedRuns', 'RunDetail', 'RunCandidates'],
  endpoints: (build) => ({
    finalizeRunProof: build.mutation<
      RunProofFinalizationReceipt,
      RunProofFinalizationCommand
    >({
      invalidatesTags: (result, _error, command) =>
        result === undefined
          ? []
          : [
              { type: 'AssignedRuns', id: command.tenantId },
              { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
              {
                type: 'RunCandidates',
                id: `${command.tenantId}:${command.runId}`,
              },
            ],
      async queryFn(
        command,
        api,
      ): Promise<
        | { data: RunProofFinalizationReceipt }
        | { error: RunProofFinalizationFailure }
      > {
        try {
          const client = clientFrom(api.extra);
          if (!isProofClient(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.finalizeProof(command, api.signal);
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunProofFinalizationFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    decideRunApproval: build.mutation<RunApprovalReceipt, RunApprovalCommand>({
      invalidatesTags: (result, _error, command) =>
        result === undefined
          ? []
          : [
              { type: 'AssignedRuns', id: command.tenantId },
              { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
              {
                type: 'RunCandidates',
                id: `${command.tenantId}:${command.runId}`,
              },
            ],
      async queryFn(
        command,
        api,
      ): Promise<{ data: RunApprovalReceipt } | { error: RunApprovalFailure }> {
        try {
          const client = clientFrom(api.extra);
          if (!isApprovalClient(client))
            return { error: { kind: 'unexpected-defect' } };
          const result = await client.decideApproval(command, api.signal);
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunApprovalFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    listAssignedRuns: build.query<AssignedRunPage, AssignedRunQuery>({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'AssignedRuns', id: query.tenantId },
      ],
      async queryFn(
        query,
        api,
      ): Promise<{ data: AssignedRunPage } | { error: RunSupervisionFailure }> {
        try {
          const result = await clientFrom(api.extra).listAssigned(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.page }
            : { error: normalizeRunSupervisionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    getAssignedRunConsole: build.query<
      AssignedRunConsole,
      AssignedRunConsoleQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunDetail', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        { data: AssignedRunConsole } | { error: RunSupervisionFailure }
      > {
        try {
          const result = await clientFrom(api.extra).getConsole(
            query,
            api.signal,
          );
          return result.ok
            ? { data: result.console }
            : { error: normalizeRunSupervisionFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    listRunHandoverCandidates: build.query<
      RunSupervisorCandidatePage,
      RunSupervisorCandidateQuery
    >({
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, query) => [
        { type: 'RunCandidates', id: `${query.tenantId}:${query.runId}` },
      ],
      async queryFn(
        query,
        api,
      ): Promise<
        | { data: RunSupervisorCandidatePage }
        | { error: RunSupervisorHandoverFailure }
      > {
        try {
          const result = await handoverClientFrom(
            api.extra,
          ).listHandoverCandidates(query, api.signal);
          return result.ok
            ? { data: result.page }
            : { error: normalizeRunHandoverFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
    handoverRunSupervisor: build.mutation<
      RunSupervisorHandoverReceipt,
      RunSupervisorHandoverCommand
    >({
      invalidatesTags: (result, _error, command) =>
        result === undefined
          ? []
          : [
              { type: 'AssignedRuns', id: command.tenantId },
              { type: 'RunDetail', id: `${command.tenantId}:${command.runId}` },
              {
                type: 'RunCandidates',
                id: `${command.tenantId}:${command.runId}`,
              },
            ],
      async queryFn(
        command,
        api,
      ): Promise<
        | { data: RunSupervisorHandoverReceipt }
        | { error: RunSupervisorHandoverFailure }
      > {
        try {
          const result = await handoverClientFrom(api.extra).handoverSupervisor(
            command,
            api.signal,
          );
          return result.ok
            ? { data: result.receipt }
            : { error: normalizeRunHandoverFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});

export const {
  useListAssignedRunsQuery,
  useLazyListAssignedRunsQuery,
  useGetAssignedRunConsoleQuery,
  useLazyGetAssignedRunConsoleQuery,
  useHandoverRunSupervisorMutation,
  useDecideRunApprovalMutation,
  useFinalizeRunProofMutation,
} = runSupervisionApi;

function isProofClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunProofFinalizationClient {
  return (
    'finalizeProof' in client && typeof client.finalizeProof === 'function'
  );
}

function isApprovalClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunApprovalClient {
  return (
    'decideApproval' in client && typeof client.decideApproval === 'function'
  );
}

function handoverClientFrom(extra: unknown): RunSupervisorHandoverClient {
  const client = clientFrom(extra);
  if (isHandoverClient(client)) return client;
  throw new Error('Run handover client is not configured');
}

function isHandoverClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunSupervisorHandoverClient {
  return (
    'listHandoverCandidates' in client &&
    typeof client.listHandoverCandidates === 'function' &&
    'handoverSupervisor' in client &&
    typeof client.handoverSupervisor === 'function'
  );
}

export function clientFrom(extra: unknown): RunSupervisionClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'runSupervision' in extra
  ) {
    const candidate = extra.runSupervision;
    if (isClient(candidate)) return candidate;
  }
  throw new Error('Run supervision client is not configured');
}

function isClient(value: unknown): value is RunSupervisionClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listAssigned' in value &&
    typeof value.listAssigned === 'function' &&
    'getConsole' in value &&
    typeof value.getConsole === 'function'
  );
}
