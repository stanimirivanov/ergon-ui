import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import { installSimulatedRunCancellationBff } from './simulated-run-cancellation-bff';

interface Fence {
  readonly leaseId: string;
  readonly revision: number;
}
interface Intent {
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly action: 'ACQUIRE' | 'RENEW' | 'RELEASE';
  readonly control?: Fence;
}
type Status =
  'AVAILABLE' | 'THIS_SESSION' | 'ANOTHER_SESSION' | 'EXPIRED' | 'TERMINAL';

interface SimulatedRunControlBff extends Awaited<
  ReturnType<typeof installSimulatedRunCancellationBff>
> {
  readonly controlIntents: () => readonly Intent[];
  readonly loseNextControlResponse: () => void;
  readonly otherSession: () => void;
  readonly expire: () => void;
  readonly denyControl: () => void;
  readonly currentFence: () => Fence;
}

/** Producer-owned synthetic history; no real authority, session, database or provider is exercised. */
export async function installSimulatedRunControlBff(
  page: Page,
): Promise<SimulatedRunControlBff> {
  const base = await installSimulatedRunCancellationBff(page);
  base.setReview('eligible');
  let status: Status = 'AVAILABLE';
  let fence: Fence = {
    leaseId: '66666666-6666-4666-8666-666666666666',
    revision: 0,
  };
  let lost = false;
  let denied = false;
  const at = '2026-10-19T08:00:00Z';
  const expiresAt = '2026-10-19T08:02:00Z';
  const history = new Map<
    string,
    { readonly intent: Intent; readonly receipt: object }
  >();
  const intents: Intent[] = [];
  await page.route('**/bff/v1/tenants/*/resolution-runs/*/control', (route) => {
    if (denied)
      return fulfillSimulatedBff(
        route,
        { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
        404,
      );
    const current = base.cancellations() > 0 ? 'TERMINAL' : status;
    return fulfillSimulatedBff(route, {
      status: current,
      supervisionRevision: 0,
      observedAt: at,
      fence: current === 'THIS_SESSION' ? fence : null,
      expiresAt:
        current === 'THIS_SESSION' || current === 'ANOTHER_SESSION'
          ? expiresAt
          : null,
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/control-commands',
    async (route) => {
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-cancellation-csrf',
      );
      const intent: Intent = route.request().postDataJSON();
      intents.push(intent);
      expect(await page.getByRole('dialog').count()).toBe(0);
      const prior = history.get(intent.commandId);
      if (prior) {
        expect(intent).toEqual(prior.intent);
        return fulfillSimulatedBff(route, prior.receipt);
      }
      if (intent.action === 'ACQUIRE') {
        expect(['AVAILABLE', 'EXPIRED']).toContain(status);
        expect(intent.control).toBeUndefined();
        fence = {
          leaseId:
            '66666666-6666-4666-8666-' +
            String(fence.revision + 1).padStart(12, '0'),
          revision: fence.revision + 1,
        };
        status = 'THIS_SESSION';
      } else {
        expect(status).toBe('THIS_SESSION');
        expect(intent.control).toEqual(fence);
        if (intent.action === 'RELEASE') status = 'AVAILABLE';
      }
      const receipt = {
        commandId: intent.commandId,
        runId: '33333333-3333-4333-8333-333333333333',
        action: intent.action,
        supervisionRevision: 0,
        control: fence,
        changedAt: at,
        expiresAt,
        recordedAt: at,
      };
      history.set(intent.commandId, { intent, receipt });
      if (lost) {
        lost = false;
        return route.abort('failed');
      }
      return fulfillSimulatedBff(route, receipt);
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/cancellation-commands',
    (route) => {
      const intent: { readonly control?: Fence } = route
        .request()
        .postDataJSON();
      if (base.cancellations() === 0) {
        expect(status).toBe('THIS_SESSION');
        expect(intent.control).toEqual(fence);
      }
      return route.fallback();
    },
  );
  return {
    ...base,
    controlIntents: () => intents,
    loseNextControlResponse: () => {
      lost = true;
    },
    otherSession: () => {
      status = 'ANOTHER_SESSION';
    },
    expire: () => {
      status = 'EXPIRED';
    },
    denyControl: () => {
      denied = true;
    },
    currentFence: () => fence,
  };
}
