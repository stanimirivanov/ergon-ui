import type { Page } from '@playwright/test';
import type { AppendFollowUpNoteCommand } from '@ergon/follow-up-data-access-web';
import type { FollowUpNote } from '@ergon/follow-up-model';
import { installSimulatedOwnedContextBff } from './simulated-owned-context-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

type NoteIntent = Pick<
  AppendFollowUpNoteCommand,
  'noteId' | 'claimId' | 'expectedOwnershipRevision' | 'text'
>;

export const historicalNote: FollowUpNote = {
  noteId: '88888888-8888-4888-8888-888888888888',
  claimId: '66666666-6666-4666-8666-666666666666',
  ownershipRevision: 1,
  authorActorId: '99999999-9999-4999-8999-999999999999',
  text: 'Prior resolver: inspect the SSO session before changing access. <script>inert text</script>',
  authoredAt: '2026-09-21T09:40:00Z',
  recordedAt: '2026-09-21T09:40:01Z',
};

/** Synthetic only: first POST is recorded but its response is lost; replay returns that receipt. */
export async function installSimulatedFollowUpNotesBff(page: Page): Promise<{
  commands: () => readonly NoteIntent[];
  reads: () => number;
  deny: () => void;
  truncate: () => void;
}> {
  // Claim 1 ended before the current claim 3; the earlier note predates claim 3.
  await installSimulatedOwnedContextBff(page, { ownershipRevision: 3 });
  const commands: NoteIntent[] = [];
  let receipt: FollowUpNote | undefined;
  let reads = 0;
  let denied = false;
  let truncated = false;
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-notes-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/notes',
    async (route) => {
      if (denied) {
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:human-follow-up-notes-not-found' },
          404,
        );
        return;
      }
      if (route.request().method() === 'GET') {
        reads += 1;
        const items = truncated
          ? Array.from({ length: 100 }, (_, index) => ({
              ...historicalNote,
              noteId: `88888888-8888-4888-8888-${(100 - index).toString(16).padStart(12, '0')}`,
            }))
          : receipt === undefined
            ? [historicalNote]
            : [receipt, historicalNote];
        await fulfillSimulatedBff(route, { items, truncated });
        return;
      }
      const body: NoteIntent = route.request().postDataJSON();
      commands.push(body);
      if (receipt === undefined) {
        receipt = {
          ...historicalNote,
          noteId: body.noteId,
          claimId: body.claimId,
          ownershipRevision: body.expectedOwnershipRevision,
          text: body.text,
          authorActorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          authoredAt: '2026-10-23T10:00:00Z',
          recordedAt: '2026-10-23T10:00:01Z',
        };
        await route.abort('failed');
        return;
      }
      await fulfillSimulatedBff(route, receipt);
    },
  );
  return {
    commands: () => commands,
    reads: () => reads,
    deny: () => {
      denied = true;
    },
    truncate: () => {
      truncated = true;
    },
  };
}
