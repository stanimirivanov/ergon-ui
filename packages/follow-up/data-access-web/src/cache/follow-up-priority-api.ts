import type { FollowUpPriorityAssignment } from '@ergon/follow-up-model';
import type {
  FollowUpPriorityClient,
  FollowUpPriorityCommand,
  FollowUpPriorityFailure,
} from '../client/follow-up-priority';
import { normalizeFollowUpPriorityFailure } from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** One session-lifetime client supplied through thunk extra, never Redux state. */
export interface FollowUpPriorityCacheDependencies {
  readonly followUpPriority: FollowUpPriorityClient;
}

/** Invalidate observations on every outcome; historical receipt never patches current metadata. */
export const followUpPriorityApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
    assignFollowUpPriority: build.mutation<
      FollowUpPriorityAssignment,
      FollowUpPriorityCommand
    >({
      queryFn: (
        command,
        api,
      ): Promise<
        | { data: FollowUpPriorityAssignment }
        | { error: FollowUpPriorityFailure }
      > =>
        executeFollowUpQuery(
          () => priorityFrom(api.extra).assignPriority(command, api.signal),
          (result) =>
            result.ok
              ? { data: result.assignment }
              : { error: normalizeFollowUpPriorityFailure(result.error) },
        ),
      invalidatesTags: (_result, _error, command) => [
        { type: 'HumanFollowUpInbox', id: command.tenantId },
        { type: 'ResolverOwnedHumanFollowUps', id: command.tenantId },
        {
          type: 'ResolverFollowUpCaseSummary',
          id: `${command.tenantId}:${command.workItemId}`,
        },
      ],
    }),
  }),
});

function priorityFrom(extra: unknown): FollowUpPriorityClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'followUpPriority' in extra
  ) {
    const client = extra.followUpPriority;
    if (
      typeof client === 'object' &&
      client !== null &&
      'assignPriority' in client &&
      typeof client.assignPriority === 'function'
    )
      return client as FollowUpPriorityClient;
  }
  throw new Error('Follow-up priority is not configured');
}
