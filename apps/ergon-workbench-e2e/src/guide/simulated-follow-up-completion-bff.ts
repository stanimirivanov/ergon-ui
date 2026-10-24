import { expect, type Page } from '@playwright/test';
import type { FollowUpCompletionCommand } from '@ergon/follow-up-data-access-web';
import {
  installSimulatedOwnedContextBff,
  ownedContextScenario,
} from './simulated-owned-context-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

type Intent = Omit<FollowUpCompletionCommand, 'tenantId' | 'workItemId'>;
type Mode = 'disabled' | 'conflict' | 'lost-response';

/** Terminal retirement with a deliberately lost first acknowledgement; no real backend is exercised. */
export async function installSimulatedFollowUpCompletionBff(
  page: Page,
): Promise<{
  commands: () => readonly Intent[];
  setMode: (mode: Mode) => void;
  loseResponse: () => void;
}> {
  await installSimulatedOwnedContextBff(page);
  const { workItem, claim, summary } = ownedContextScenario;
  const commands: Intent[] = [];
  let mode: Mode = 'disabled';
  let receipt:
    | (Intent & { workItemId: string; completedAt: string; recordedAt: string })
    | undefined;
  let loseResponse: () => void = () => undefined;
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, {
      items: receipt ? [] : [{ workItem, claim }],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/case-summary',
    (route) =>
      receipt
        ? fulfillSimulatedBff(
            route,
            {
              type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
            },
            404,
          )
        : fulfillSimulatedBff(route, summary),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/*/notes', (route) =>
    receipt
      ? fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:human-follow-up-notes-not-found' },
          404,
        )
      : fulfillSimulatedBff(route, { items: [], truncated: false }),
  );
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-completion-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/completions',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-completion-token',
      );
      const intent: Intent = route.request().postDataJSON();
      expect(Object.keys(intent).sort()).toEqual([
        'claimId',
        'commandId',
        'expectedOwnershipRevision',
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
                ? 'urn:ergon:problem:human-follow-up-completion-unavailable'
                : 'urn:ergon:problem:human-follow-up-completion-conflict',
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
        completedAt: '2026-10-24T12:00:00Z',
        recordedAt: '2026-10-24T12:00:01Z',
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
  };
}
