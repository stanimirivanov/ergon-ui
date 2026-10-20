import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import { installSimulatedRunSupervisionBff } from './simulated-run-supervision-bff';

type Mode =
  'empty' | 'recorded' | 'truncated' | 'denied' | 'unsupported' | 'malformed';
const preparation = {
  stepId: 'verify-account-owner',
  capability: 'identity.lookup',
  connector: 'synthetic-identity-gateway',
  preparedAt: '2026-10-20T08:02:00.123456789Z',
  recordedAt: '2026-10-20T08:01:00.123456789Z',
  completion: null,
};
const completion = {
  outcome: 'UNKNOWN',
  completedAt: '2026-10-20T07:59:00Z',
  recordedAt: '2026-10-20T07:58:00Z',
  timing: {
    source: 'ergon.dev/measurement/connector-call/v1',
    startedAt: '2026-10-20T08:03:00Z',
    elapsedNanoseconds: '9223372036854775807',
  },
};

/** Producer-owned audit examples, not actual calls, authority or database history. Captured modes/held responses make retirement deterministic. */
export async function installSimulatedInvocationHistoryBff(page: Page): Promise<
  Awaited<ReturnType<typeof installSimulatedRunSupervisionBff>> & {
    setHistory: (mode: Mode) => void;
    historyReads: () => number;
    holdHistory: () => void;
    releaseHistory: () => void;
  }
> {
  const base = await installSimulatedRunSupervisionBff(page, {
    supervisionRevision: 3,
  });
  let mode: Mode = 'empty',
    reads = 0;
  let held: Promise<void> | undefined, release: (() => void) | undefined;
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/invocation-history',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).search).toBe('');
      reads++;
      const selected = mode,
        wait = held;
      held = undefined;
      if (wait) await wait;
      if (selected === 'denied')
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
          404,
        );
      if (selected === 'unsupported')
        return fulfillSimulatedBff(route, { type: 'about:blank' }, 404);
      return fulfillSimulatedBff(route, {
        observedAt: '2026-10-20T08:00:00Z',
        supervisionRevision: 3,
        entries:
          selected === 'empty'
            ? []
            : selected === 'truncated'
              ? Array.from({ length: 100 }, () => preparation)
              : [
                  preparation,
                  {
                    ...preparation,
                    completion: {
                      ...completion,
                      outcome: selected === 'malformed' ? 'RUNNING' : 'UNKNOWN',
                    },
                  },
                  {
                    ...preparation,
                    completion: {
                      ...completion,
                      outcome: 'SUCCEEDED',
                      timing: { ...completion.timing, elapsedNanoseconds: '0' },
                    },
                  },
                  {
                    ...preparation,
                    completion: {
                      ...completion,
                      outcome: 'FAILED',
                      timing: {
                        ...completion.timing,
                        elapsedNanoseconds: '305123456',
                      },
                    },
                  },
                ],
        truncated: selected === 'truncated',
      });
    },
  );
  return {
    ...base,
    setHistory: (next) => {
      mode = next;
    },
    historyReads: () => reads,
    holdHistory: () => {
      if (release) throw new Error('History already held');
      held = new Promise((resolve) => {
        release = resolve;
      });
    },
    releaseHistory: () => {
      if (!release) throw new Error('No history held');
      release();
      release = undefined;
    },
  };
}
