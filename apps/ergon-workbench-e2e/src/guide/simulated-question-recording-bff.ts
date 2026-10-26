import type { Page } from '@playwright/test';
import type { RecordFollowUpQuestionCommand } from '@ergon/follow-up-data-access-web';
import type { FollowUpQuestion } from '@ergon/follow-up-model';
import {
  historicalQuestion,
  installSimulatedFollowUpQuestionsBff,
} from './simulated-follow-up-questions-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

type Intent = Pick<
  RecordFollowUpQuestionCommand,
  'requestId' | 'claimId' | 'expectedOwnershipRevision' | 'question'
>;

/** Synthetic durable-first/lost-acknowledgement scenario, not real delivery or authority. */
export async function installSimulatedQuestionRecordingBff(
  page: Page,
): Promise<{
  readonly commands: () => readonly Intent[];
  readonly conflict: () => void;
}> {
  await installSimulatedFollowUpQuestionsBff(page);
  const commands: Intent[] = [];
  let receipt: FollowUpQuestion | undefined;
  let conflict = false;
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-question-token',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/information-requests',
    async (route) => {
      if (route.request().method() === 'GET') {
        if (receipt === undefined) {
          await route.fallback();
          return;
        }
        await fulfillSimulatedBff(route, {
          items: [receipt, historicalQuestion],
          truncated: false,
        });
        return;
      }
      if (
        route.request().headers()['x-csrf-token'] !== 'synthetic-question-token'
      )
        throw new Error('Question POST requires session CSRF');
      const intent: Intent = route.request().postDataJSON();
      commands.push(intent);
      if (conflict) {
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:requester-information-request-conflict' },
          409,
        );
        return;
      }
      if (receipt === undefined) {
        receipt = {
          ...historicalQuestion,
          requestId: intent.requestId,
          claimId: intent.claimId,
          ownershipRevision: intent.expectedOwnershipRevision,
          question: intent.question,
          authorActorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          requestedAt: '2026-10-26T10:00:00Z',
          recordedAt: '2026-10-26T10:00:01Z',
        };
        await route.abort('failed');
        return;
      }
      if (
        receipt.requestId !== intent.requestId ||
        receipt.claimId !== intent.claimId ||
        receipt.ownershipRevision !== intent.expectedOwnershipRevision ||
        receipt.question !== intent.question
      )
        throw new Error('Recovery changed immutable question intent');
      await fulfillSimulatedBff(route, receipt);
    },
  );
  return {
    commands: () => commands,
    conflict: () => {
      conflict = true;
    },
  };
}
