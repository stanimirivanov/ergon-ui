import { expect, type Page } from '@playwright/test';
import type { FollowUpHandoverCommand } from '@ergon/follow-up-data-access-web';
import {
  installSimulatedOwnedContextBff,
  ownedContextScenario,
} from './simulated-owned-context-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

type Intent = Omit<FollowUpHandoverCommand, 'tenantId' | 'workItemId'>;
type Mode = 'disabled' | 'conflict' | 'lost-response';

export const recipientActorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const senderActorId = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';
const successorClaimId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const handoverHistoryText =
  'Original resolver: inspect SSO diagnostics before changing access.';

/**
 * Simulates an atomic transfer whose first acknowledgement is lost. Switching
 * viewer is a test-only identity transition, never an application login feature.
 * Historical replay does not restore the sender's private reads.
 */
export async function installSimulatedFollowUpHandoverBff(page: Page): Promise<{
  commands: () => readonly Intent[];
  setMode: (mode: Mode) => void;
  loseResponse: () => void;
  viewAsRecipient: () => void;
}> {
  await installSimulatedOwnedContextBff(page);
  const { workItem, claim, summary } = ownedContextScenario;
  const commands: Intent[] = [];
  let mode: Mode = 'disabled';
  let viewer = senderActorId;
  let owner = senderActorId;
  let receipt:
    | (Intent & {
        workItemId: string;
        originalClaimId: string;
        successorClaimId: string;
        ownershipRevision: number;
        handedOverAt: string;
        recordedAt: string;
      })
    | undefined;
  let loseResponse: () => void = () => undefined;
  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: viewer,
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items:
        viewer === owner
          ? [
              {
                workItem: { ...workItem, ownershipRevision: receipt ? 3 : 1 },
                claim: receipt
                  ? {
                      ...claim,
                      claimId: successorClaimId,
                      claimedAt: receipt.handedOverAt,
                      recordedAt: receipt.recordedAt,
                    }
                  : claim,
              },
            ]
          : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    (route) =>
      viewer === owner
        ? fulfillSimulatedBff(route, {
            ...summary,
            followUp: {
              ...summary.followUp,
              claimedAt: receipt?.handedOverAt ?? claim.claimedAt,
            },
          })
        : fulfillSimulatedBff(
            route,
            {
              type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
            },
            404,
          ),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/*/notes', (route) =>
    viewer === owner
      ? fulfillSimulatedBff(route, {
          items: [
            {
              noteId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              claimId: claim.claimId,
              ownershipRevision: 1,
              authorActorId: senderActorId,
              text: handoverHistoryText,
              authoredAt: '2026-09-22T10:20:00Z',
              recordedAt: '2026-09-22T10:20:01Z',
            },
          ],
          truncated: false,
        })
      : fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:human-follow-up-notes-not-found' },
          404,
        ),
  );
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-handover-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/handovers',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-handover-token',
      );
      const intent: Intent = route.request().postDataJSON();
      expect(Object.keys(intent).sort()).toEqual([
        'claimId',
        'commandId',
        'expectedOwnershipRevision',
        'recipientActorId',
      ]);
      expect(intent.claimId).toBe(claim.claimId);
      expect(intent.expectedOwnershipRevision).toBe(1);
      expect(intent.recipientActorId).toBe(recipientActorId);
      // Assert the privacy boundary at I/O, not merely after an eventual rerender.
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByText(summary.case.goal, { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Current claim', { exact: true }),
      ).toHaveCount(0);
      commands.push(intent);
      if (mode !== 'lost-response') {
        await fulfillSimulatedBff(
          route,
          {
            type:
              mode === 'disabled'
                ? 'urn:ergon:problem:human-follow-up-handover-unavailable'
                : 'urn:ergon:problem:human-follow-up-handover-conflict',
          },
          mode === 'disabled' ? 503 : 409,
        );
        return;
      }
      if (receipt) {
        expect(intent).toEqual(commands.at(-2));
        await fulfillSimulatedBff(route, receipt);
        return;
      }
      owner = recipientActorId;
      receipt = {
        ...intent,
        workItemId: workItem.workItemId,
        originalClaimId: intent.claimId,
        successorClaimId,
        ownershipRevision: 3,
        handedOverAt: '2026-10-23T12:00:00Z',
        recordedAt: '2026-10-23T12:00:01Z',
      };
      await new Promise<void>((resolve) => {
        loseResponse = resolve;
      });
      await route.abort('failed');
    },
  );
  return {
    commands: () => commands,
    setMode: (value) => {
      mode = value;
    },
    loseResponse: () => loseResponse(),
    viewAsRecipient: () => {
      viewer = recipientActorId;
    },
  };
}
