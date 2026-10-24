import type { FollowUpCompletion } from '@ergon/follow-up-model';
import type {
  FollowUpCompletionClient,
  FollowUpCompletionCommand,
  FollowUpCompletionFailure,
} from '../client/follow-up-completion';
import { normalizeFollowUpCompletionFailure } from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** Supply the shared session-lifetime adapter through thunk extra, never Redux state. */
export interface FollowUpCompletionCacheDependencies {
  readonly followUpCompletion: FollowUpCompletionClient;
}

/** Completion invalidates resources; the receipt never substitutes for a fresh owner gate. */
export const followUpCompletionApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
    completeFollowUp: build.mutation<
      FollowUpCompletion,
      FollowUpCompletionCommand
    >({
      queryFn: (
        command,
        api,
      ): Promise<
        { data: FollowUpCompletion } | { error: FollowUpCompletionFailure }
      > =>
        executeFollowUpQuery(
          () => completionFrom(api.extra).complete(command, api.signal),
          (result) =>
            result.ok
              ? { data: result.completion }
              : { error: normalizeFollowUpCompletionFailure(result.error) },
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
    }),
  }),
});

function completionFrom(extra: unknown): FollowUpCompletionClient {
  if (
    typeof extra === 'object' &&
    extra !== null &&
    'followUpCompletion' in extra
  ) {
    const client = extra.followUpCompletion;
    if (
      typeof client === 'object' &&
      client !== null &&
      'complete' in client &&
      typeof client.complete === 'function'
    )
      return client as FollowUpCompletionClient;
  }
  throw new Error('Follow-up completion is not configured');
}
