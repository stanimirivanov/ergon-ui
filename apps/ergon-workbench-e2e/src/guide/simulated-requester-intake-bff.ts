import { expect, type Page } from '@playwright/test';
import type { IntakeCommand } from '@ergon/requester-intake-data-access-web';
import { fulfillSimulatedBff } from './simulated-bff-response';

export const intakeTenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
export const intakeGoal = ' Restore customer workspace access ';
export const intakeObservation =
  ' Customer workspace 😀 <script>inert report</script>\nFirefox cannot open the workspace. ';
const at = '2026-10-27T09:00:00Z';

/** Synthetic immutable winner with lost acknowledgement; exact routes only, no live fallback or authorization claims. */
export async function installSimulatedRequesterIntakeBff(page: Page): Promise<{
  posts(): number;
  csrfReads(): number;
  sessionReads(): number;
  progressReads(): number;
  caseId(): string;
  releaseProgress(): void;
}> {
  const root = '/bff/v1/tenants/' + intakeTenant;
  let winner: IntakeCommand | undefined;
  let posts = 0,
    csrfReads = 0,
    sessionReads = 0,
    progressReads = 0;
  let releaseProgress = (): void => undefined;
  await page.route('**/bff/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === root + '/session') {
      expect(request.method()).toBe('GET');
      sessionReads++;
      await fulfillSimulatedBff(route, {
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: 'requester-sso',
        registeredAt: at,
        recordedAt: at,
      });
    } else if (path === '/bff/v1/csrf') {
      expect(request.method()).toBe('GET');
      csrfReads++;
      // Record at the actual I/O boundary, without holding a request through narration/video capture.
      expect(await page.getByRole('textbox').count()).toBe(0);
      expect(
        await page
          .getByRole('heading', { name: 'Start a request' })
          .evaluate((element) => element === document.activeElement),
      ).toBe(true);
      await fulfillSimulatedBff(route, {
        headerName: 'X-CSRF-TOKEN',
        token: 'intake-token-' + csrfReads,
      });
    } else if (
      path === root + '/requester-cases' &&
      request.method() === 'POST'
    ) {
      posts++;
      expect(request.headers()['x-csrf-token']).toBe(
        'intake-token-' + csrfReads,
      );
      const body: unknown = request.postDataJSON();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('caseId' in body) ||
        typeof body.caseId !== 'string'
      )
        throw new Error('Synthetic intake requires a case UUID');
      expect(Object.keys(body).sort()).toEqual([
        'caseId',
        'goal',
        'initialObservation',
      ]);
      expect(body.caseId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
      );
      expect(body).toEqual({
        caseId: body.caseId,
        goal: intakeGoal,
        initialObservation: intakeObservation,
      });
      const intent = {
        tenantId: intakeTenant,
        caseId: body.caseId,
        goal: intakeGoal,
        initialObservation: intakeObservation,
      };
      if (winner === undefined) winner = intent;
      else expect(intent).toEqual(winner);
      if (posts === 1)
        await fulfillSimulatedBff(route, { caseId: winner.caseId }, 201);
      else
        await fulfillSimulatedBff(route, {
          caseId: winner.caseId,
          goal: intakeGoal.trim(),
          initialObservation: intakeObservation.trim(),
          openedAt: '2026-10-27T09:00:00.123456789Z',
          recordedAt: '2026-10-27T09:00:01.000001Z',
        });
    } else if (
      winner !== undefined &&
      path === root + '/requester-cases/' + winner.caseId + '/progress'
    ) {
      expect(request.method()).toBe('GET');
      progressReads++;
      await new Promise<void>((resolve) => {
        releaseProgress = resolve;
      });
      await fulfillSimulatedBff(route, {
        caseId: winner.caseId,
        goal: intakeGoal.trim(),
        status: 'OPEN',
        openedAt: at,
        updatedAt: at,
      });
    } else if (
      winner !== undefined &&
      path ===
        root + '/requester-cases/' + winner.caseId + '/information-requests'
    ) {
      expect(request.method()).toBe('GET');
      await fulfillSimulatedBff(route, { items: [], truncated: false });
    } else
      throw new Error(
        'Unexpected synthetic intake route: ' + request.method() + ' ' + path,
      );
  });
  return {
    posts: () => posts,
    csrfReads: () => csrfReads,
    sessionReads: () => sessionReads,
    progressReads: () => progressReads,
    caseId: () => {
      if (winner === undefined) throw new Error('No synthetic opening');
      return winner.caseId;
    },
    releaseProgress: () => releaseProgress(),
  };
}
