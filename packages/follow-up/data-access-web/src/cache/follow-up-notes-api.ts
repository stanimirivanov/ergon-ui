import type { FollowUpNote, FollowUpNotes } from '@ergon/follow-up-model';
import type { ResolverFollowUpCaseSummaryFailure } from '../client';
import type {
  AppendFollowUpNoteCommand,
  FollowUpNotesClient,
  FollowUpNotesQuery,
  FollowUpNoteFailure,
} from '../client/follow-up-notes';
import {
  normalizeFollowUpNoteFailure,
  normalizeResolverFollowUpCaseSummaryFailure,
} from '../client/normalize-human-follow-up-failures';
import { executeFollowUpQuery, humanFollowUpApi } from './human-follow-up-api';

/** Store composition supplies the same session-lifetime adapter, never Redux state. */
export interface FollowUpNotesCacheDependencies {
  readonly followUpNotes: FollowUpNotesClient;
}

/** Private notes share the existing API reducer but never invalidate case proof or ownership. */
export const followUpNotesApi = humanFollowUpApi.injectEndpoints({
  endpoints: (build) => ({
    followUpNotes: build.query<FollowUpNotes, FollowUpNotesQuery>({
      keepUnusedDataFor: 0,
      queryFn: (
        query,
        api,
      ): Promise<
        { data: FollowUpNotes } | { error: ResolverFollowUpCaseSummaryFailure }
      > =>
        executeFollowUpQuery(
          () => notesFrom(api.extra).listNotes(query, api.signal),
          (result) =>
            result.ok
              ? { data: result.notes }
              : {
                  error: normalizeResolverFollowUpCaseSummaryFailure(
                    result.error,
                  ),
                },
        ),
    }),
    appendFollowUpNote: build.mutation<FollowUpNote, AppendFollowUpNoteCommand>(
      {
        queryFn: (
          command,
          api,
        ): Promise<{ data: FollowUpNote } | { error: FollowUpNoteFailure }> =>
          executeFollowUpQuery(
            () => notesFrom(api.extra).appendNote(command, api.signal),
            (result) =>
              result.ok
                ? { data: result.note }
                : { error: normalizeFollowUpNoteFailure(result.error) },
          ),
      },
    ),
  }),
});

function notesFrom(extra: unknown): FollowUpNotesClient {
  if (typeof extra === 'object' && extra !== null && 'followUpNotes' in extra) {
    const client = extra.followUpNotes;
    if (
      typeof client === 'object' &&
      client !== null &&
      'listNotes' in client &&
      typeof client.listNotes === 'function' &&
      'appendNote' in client &&
      typeof client.appendNote === 'function'
    )
      return client as FollowUpNotesClient;
  }
  throw new Error('Follow-up notes are not configured');
}
