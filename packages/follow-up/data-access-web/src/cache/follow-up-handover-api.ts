import type { FollowUpHandover } from '@ergon/follow-up-model';
import type {
  FollowUpHandoverClient,
  FollowUpHandoverCommand,
  FollowUpHandoverFailure,
} from '../client/follow-up-handover';
import { normalizeFollowUpHandoverFailure } from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** Supply the shared session-lifetime adapter through thunk extra, never Redux state. */
export interface FollowUpHandoverCacheDependencies {
  readonly followUpHandover: FollowUpHandoverClient;
}

/** Handover invalidates resources; the receipt never substitutes for a fresh owner gate. */
export const followUpHandoverApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
    handOverFollowUp: build.mutation<FollowUpHandover, FollowUpHandoverCommand>(
      {
        queryFn: (
          command,
          api,
        ): Promise<
          { data: FollowUpHandover } | { error: FollowUpHandoverFailure }
        > =>
          executeFollowUpQuery(
            () => handoverFrom(api.extra).handOver(command, api.signal),
            (result) =>
              result.ok
                ? { data: result.handover }
                : { error: normalizeFollowUpHandoverFailure(result.error) },
          ),
        invalidatesTags: (_result, _error, command) => [
          { type: 'HumanFollowUpInbox', id: command.tenantId },
          { type: 'ResolverOwnedHumanFollowUps', id: command.tenantId },
          {
            type: 'ResolverFollowUpCaseSummary',
            id: `${command.tenantId}:${command.workItemId}`,
          },
          {
            type: 'FollowUpNotes',
            id: `${command.tenantId}:${command.workItemId}`,
          },
        ],
      },
    ),
  }),
});

function handoverFrom(extra: unknown): FollowUpHandoverClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'followUpHandover' in extra
  ) {
    const client = extra.followUpHandover;
    if (
      typeof client === 'object' &&
      client !== null &&
      'handOver' in client &&
      typeof client.handOver === 'function'
    )
      return client as FollowUpHandoverClient;
  }
  throw new Error('Follow-up handover is not configured');
}
