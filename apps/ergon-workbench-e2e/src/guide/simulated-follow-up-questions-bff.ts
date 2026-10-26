import type { Page } from '@playwright/test';
import type { FollowUpQuestion } from '@ergon/follow-up-model';
import { installSimulatedOwnedContextBff } from './simulated-owned-context-bff';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const historicalQuestion: FollowUpQuestion = {
  requestId: '88888888-8888-4888-8888-888888888888',
  caseId: '22222222-2222-4222-8222-222222222222',
  claimId: '66666666-6666-4666-8666-666666666666',
  ownershipRevision: 1,
  authorActorId: '99999999-9999-4999-8999-999999999999',
  question: 'Which workspace did you open? <script>inert question</script> 😀',
  requestedAt: '2026-09-21T09:40:00Z',
  recordedAt: '2026-09-21T09:40:01Z',
};
type HistoryMode = 'populated' | 'empty' | 'truncated' | 'temporary' | 'denied';

/** Synthetic history only: no delivery, requester response or authorization decision is simulated as real. */
export async function installSimulatedFollowUpQuestionsBff(
  page: Page,
): Promise<{
  readonly reads: () => number;
  readonly setMode: (mode: HistoryMode) => void;
}> {
  await installSimulatedOwnedContextBff(page, { ownershipRevision: 3 });
  let mode: HistoryMode = 'populated';
  let reads = 0;
  await page.route(
    '**/bff/v1/tenants/*/human-follow-ups/*/information-requests',
    async (route) => {
      if (route.request().method() !== 'GET')
        throw new Error('History must not send a command');
      reads += 1;
      if (mode === 'denied' || mode === 'temporary') {
        await fulfillSimulatedBff(
          route,
          {
            type:
              mode === 'denied'
                ? 'urn:ergon:problem:requester-information-request-not-found'
                : 'urn:ergon:problem:service-unavailable',
          },
          mode === 'denied' ? 404 : 503,
        );
        return;
      }
      const items =
        mode === 'empty'
          ? []
          : mode === 'truncated'
            ? Array.from({ length: 100 }, (_, index) => ({
                ...historicalQuestion,
                requestId: `88888888-8888-4888-8888-${(100 - index).toString(16).padStart(12, '0')}`,
              }))
            : [historicalQuestion];
      await fulfillSimulatedBff(route, {
        items,
        truncated: mode === 'truncated',
      });
    },
  );
  return {
    reads: () => reads,
    setMode: (next) => {
      mode = next;
    },
  };
}
