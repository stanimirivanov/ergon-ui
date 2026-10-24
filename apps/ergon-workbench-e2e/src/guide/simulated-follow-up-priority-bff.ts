import { expect, type Page } from '@playwright/test';
import type { FollowUpPriorityCommand } from '@ergon/follow-up-data-access-web';
import {
  installSimulatedOwnedContextBff,
  ownedContextScenario,
} from './simulated-owned-context-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

type Intent = Omit<FollowUpPriorityCommand, 'tenantId' | 'workItemId'>;
type Mode = 'disabled' | 'conflict' | 'lost-response';

/** Producer-owned synthetic assignment/replay, including later metadata; no real authority or database is exercised. */
export async function installSimulatedFollowUpPriorityBff(page: Page): Promise<{
  commands: () => readonly Intent[];
  setMode: (mode: Mode) => void;
  loseResponse: () => void;
  withdrawOwnership: () => void;
}> {
  await installSimulatedOwnedContextBff(page);
  const { workItem, claim, summary } = ownedContextScenario;
  const commands: Intent[] = [];
  let mode: Mode = 'disabled';
  let owned = true;
  let current = { priority: 'NORMAL', priorityRevision: 0 };
  let receipt:
    | (Intent & {
        workItemId: string;
        priorityRevision: number;
        assignedAt: string;
        recordedAt: string;
      })
    | undefined;
  let loseResponse: () => void = () => undefined;
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items: owned ? [{ workItem: { ...workItem, ...current }, claim }] : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    (route) =>
      owned
        ? fulfillSimulatedBff(route, {
            ...summary,
            followUp: { ...summary.followUp, ...current },
          })
        : fulfillSimulatedBff(
            route,
            {
              type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
            },
            404,
          ),
  );
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-priority-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/priority-assignments',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-priority-token',
      );
      const intent: Intent = route.request().postDataJSON();
      expect(Object.keys(intent).sort()).toEqual([
        'claimId',
        'commandId',
        'expectedOwnershipRevision',
        'expectedPriorityRevision',
        'priority',
      ]);
      expect(intent.claimId).toBe(claim.claimId);
      expect(intent.expectedOwnershipRevision).toBe(1);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByText(summary.case.goal, { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('region', { name: 'Current claim' }),
      ).toHaveCount(0);
      commands.push(intent);
      if (mode !== 'lost-response') {
        await fulfillSimulatedBff(
          route,
          {
            type:
              mode === 'disabled'
                ? 'urn:ergon:problem:human-follow-up-priority-unavailable'
                : 'urn:ergon:problem:human-follow-up-priority-conflict',
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
      receipt = {
        ...intent,
        workItemId: workItem.workItemId,
        priorityRevision: intent.expectedPriorityRevision + 1,
        assignedAt: '2026-10-24T12:00:00Z',
        recordedAt: '2026-10-24T12:00:01Z',
      };
      // A later independent assignment can supersede a recovered historical receipt.
      current = {
        priority: 'URGENT',
        priorityRevision: receipt.priorityRevision + 1,
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
    withdrawOwnership: () => {
      owned = false;
    },
  };
}
