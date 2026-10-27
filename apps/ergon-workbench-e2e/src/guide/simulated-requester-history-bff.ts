import type { Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const requesterHistoryQuestion = {
  requestId: '33333333-3333-4333-8333-333333333333',
  question: ' Which workspace 😀 <script>inert question</script>\n',
  requestedAt: '2026-10-25T09:00:00Z',
  recordedAt: '2026-10-25T09:00:01Z',
};
export const requesterHistoryAnswer = {
  responseId: '77777777-7777-4777-8777-777777777777',
  answer:
    ' The customer workspace 😀 <script>inert answer</script>\nSecond line.',
  respondedAt: '2026-10-25T09:01:00.123456789Z',
  recordedAt: '2026-10-25T09:01:01.000001Z',
};

/** Synthetic requester-only projection; a held denial exercises withdrawal without changing progress. */
export async function installSimulatedRequesterHistoryBff(page: Page): Promise<{
  setMode(mode: 'populated' | 'empty' | 'truncated' | 'held-denial'): void;
  release(): void;
  reads(): number;
}> {
  let mode: 'populated' | 'empty' | 'truncated' | 'held-denial' = 'populated';
  let reads = 0;
  let release = (): void => undefined;
  await page.route(
    '**/bff/v1/tenants/*/requester-cases/*/information-requests',
    async (route) => {
      reads += 1;
      if (mode === 'held-denial') {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:requester-case-not-found' },
          404,
        );
        return;
      }
      const items =
        mode === 'empty'
          ? []
          : mode === 'truncated'
            ? Array.from({ length: 100 }, (_, index) => ({
                ...requesterHistoryQuestion,
                requestId: `00000000-0000-4000-8000-${(100 - index).toString(16).padStart(12, '0')}`,
                response: null,
              }))
            : [
                {
                  ...requesterHistoryQuestion,
                  recordedAt: '2026-10-25T09:00:03Z',
                  response: {
                    ...requesterHistoryAnswer,
                    requesterActorId: 'PRIVATE-REQUESTER',
                  },
                  authorActorId: 'PRIVATE-RESOLVER',
                },
                {
                  ...requesterHistoryQuestion,
                  requestId: '22222222-2222-4222-8222-222222222222',
                  question: 'Which browser did you use?',
                  recordedAt: '2026-10-25T09:00:02Z',
                  response: null,
                },
                {
                  ...requesterHistoryQuestion,
                  requestId: '11111111-1111-4111-8111-111111111111',
                  question: 'Earlier server question',
                },
              ];
      await fulfillSimulatedBff(route, {
        items,
        truncated: mode === 'truncated',
      });
    },
  );
  return {
    setMode: (value) => {
      mode = value;
    },
    release: () => release(),
    reads: () => reads,
  };
}
