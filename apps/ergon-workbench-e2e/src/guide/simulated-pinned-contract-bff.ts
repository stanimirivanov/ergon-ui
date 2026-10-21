import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  installSimulatedRunSupervisionBff,
  assignedRunId,
} from './simulated-run-supervision-bff';

type Mode = 'valid' | 'bounded' | 'denied' | 'unsupported' | 'malformed';
/** Producer-owned normalized wire examples; switching modes is not a real contract publication, authorization change or runtime execution. */
export async function installSimulatedPinnedContractBff(page: Page): Promise<
  Awaited<ReturnType<typeof installSimulatedRunSupervisionBff>> & {
    setContract: (mode: Mode) => void;
    contractReads: () => number;
    holdContract: () => void;
    releaseContract: () => void;
  }
> {
  const base = await installSimulatedRunSupervisionBff(page, {
    supervisionRevision: 3,
  });
  let mode: Mode = 'valid',
    reads = 0,
    held: Promise<void> | undefined,
    release: (() => void) | undefined;
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/pinned-contract',
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
      const pinned = {
        id: 'verify-account-owner',
        capability: 'identity.lookup',
        risk: 'LOW',
        approval: 'NONE',
      };
      return fulfillSimulatedBff(route, {
        runId: assignedRunId,
        supervisionRevision: 3,
        observedAt: '2026-10-21T08:00:00Z',
        pinnedStepId: 'verify-account-owner',
        contractRecordedAt: '2026-10-21T08:01:00.123456789Z',
        contract: {
          schema: 'ergon.dev/resolution-contract/v1alpha1',
          key: 'access-restoration',
          revision: selected === 'malformed' ? 99 : 2,
          applicability: {
            fact: 'account.state',
            equals: ' Locked <b>literal</b> ',
          },
          requiredEvidence: ['account.state', 'account.owner'],
          steps:
            selected === 'bounded'
              ? Array.from({ length: 50 }, (_, i) =>
                  i === 0
                    ? pinned
                    : {
                        id: 'declared-' + i,
                        capability: 'identity.inspect',
                        risk: 'LOW',
                        approval: 'NONE',
                      },
                )
              : [
                  {
                    id: 'z-observe',
                    capability: 'identity.inspect',
                    risk: 'LOW',
                    approval: 'NONE',
                  },
                  pinned,
                  {
                    id: 'a-not-scheduled',
                    capability: 'identity.verify',
                    risk: 'MEDIUM',
                    approval: 'REQUESTER',
                  },
                ],
          outcomeProof: { fact: 'account.state', equals: 'ACTIVE' },
        },
      });
    },
  );
  return {
    ...base,
    setContract: (next) => {
      mode = next;
    },
    contractReads: () => reads,
    holdContract: () => {
      if (release) throw new Error('Contract already held');
      held = new Promise((resolve) => {
        release = resolve;
      });
    },
    releaseContract: () => {
      if (!release) throw new Error('No held contract');
      release();
      release = undefined;
    },
  };
}
