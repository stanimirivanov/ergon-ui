import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const requesterAnswerCoordinates = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId: '20000000-0000-4000-8000-000000000001',
};
export const requesterAnswerText =
  ' Customer workspace 😀 <script>inert answer</script>\nFirefox, exact final text. ';
const question = {
  requestId: '22222222-2222-4222-8222-222222222222',
  question: 'Which browser did you use?',
  requestedAt: '2026-10-27T09:00:00Z',
  recordedAt: '2026-10-27T09:00:02Z',
};
const second = {
  ...question,
  requestId: '11111111-1111-4111-8111-111111111111',
  question: 'Which workspace?',
  recordedAt: '2026-10-27T09:00:01Z',
};

/** Synthetic immutable-winner/replay fixture, never production authorization evidence. All responses retain the guide network marker. */
export async function installSimulatedRequesterAnswerBff(page: Page): Promise<{
  csrfReads(): number;
  posts(): number;
  historyReads(): number;
  releaseHistory(): void;
  closeOnNextCommand(): void;
}> {
  const { tenantId, caseId } = requesterAnswerCoordinates;
  const root = `/bff/v1/tenants/${tenantId}/requester-cases/${caseId}`;
  let csrfReads = 0;
  let historyReads = 0;
  const commands: unknown[] = [];
  let responseId: string | undefined;
  let closed = false;
  let closeNext = false;
  let releaseHistory = (): void => undefined;
  const answer = (): object | null =>
    responseId === undefined
      ? null
      : {
          responseId,
          answer: requesterAnswerText,
          respondedAt: '2026-10-27T09:01:00.123456789Z',
          recordedAt: '2026-10-27T09:01:00.000001Z',
        };
  await page.route('**/bff/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === `/bff/v1/tenants/${tenantId}/session`) {
      expect(request.method()).toBe('GET');
      await fulfillSimulatedBff(route, {
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: 'requester-sso',
        registeredAt: question.requestedAt,
        recordedAt: question.recordedAt,
      });
    } else if (path === `${root}/progress`) {
      expect(request.method()).toBe('GET');
      await fulfillSimulatedBff(route, {
        caseId,
        goal: 'Restore team workspace access',
        status: closed ? 'VERIFIED_RESOLVED' : 'OPEN',
        openedAt: question.requestedAt,
        updatedAt: question.recordedAt,
      });
    } else if (path === `${root}/information-requests`) {
      expect(request.method()).toBe('GET');
      historyReads += 1;
      if (commands.length === 2)
        await new Promise<void>((resolve) => {
          releaseHistory = resolve;
        });
      await fulfillSimulatedBff(route, {
        items: [
          { ...question, response: answer() },
          { ...second, response: null },
        ],
        truncated: false,
      });
    } else if (path === '/bff/v1/csrf') {
      expect(request.method()).toBe('GET');
      csrfReads += 1;
      // Assert at the actual I/O boundary, without holding a five-second command
      // open across screenshot/video work on a potentially loaded machine.
      await expect(
        page.getByText('Restore team workspace access', { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('complementary', { name: 'Request details' }),
      ).toHaveCount(0);
      await expect(page.locator('time')).toHaveCount(0);
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await fulfillSimulatedBff(route, {
        headerName: 'X-CSRF-TOKEN',
        token: `synthetic-token-${csrfReads}`,
      });
    } else if (
      path ===
      `${root}/information-requests/${closeNext ? second.requestId : question.requestId}/responses`
    ) {
      expect(request.method()).toBe('POST');
      expect(request.headers()['x-csrf-token']).toBe(
        `synthetic-token-${csrfReads}`,
      );
      const body: { responseId: string; answer: string } =
        request.postDataJSON();
      expect(Object.keys(body).sort()).toEqual(['answer', 'responseId']);
      expect(body.answer).toBe(requesterAnswerText);
      expect(body.responseId).toMatch(/^[0-9a-f-]{36}$/u);
      commands.push(body);
      if (closeNext) {
        closed = true;
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:requester-response-not-found' },
          404,
        );
      } else if (commands.length === 1) {
        responseId = body.responseId;
        // The write exists, but an incomplete acknowledgement must remain uncertain.
        await fulfillSimulatedBff(route, { responseId }, 201);
      } else {
        expect(body).toEqual(commands[0]);
        await fulfillSimulatedBff(
          route,
          { ...answer(), caseId, requestId: question.requestId },
          200,
        );
      }
    } else throw new Error(`Unexpected requester fixture route: ${path}`);
  });
  return {
    csrfReads: () => csrfReads,
    posts: () => commands.length,
    historyReads: () => historyReads,
    releaseHistory: () => releaseHistory(),
    closeOnNextCommand: () => {
      closeNext = true;
    },
  };
}
