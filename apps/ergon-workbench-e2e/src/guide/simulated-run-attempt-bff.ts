import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  simulatedRunSupervisionSnapshot,
} from './simulated-run-supervision-bff';

export const predecessorAttemptId = '77777777-7777-4777-8777-777777777777';
export const originAttemptPolicy = 'synthetic-origin-attempt-policy';
export const predecessorAttemptPolicy = 'synthetic-predecessor-attempt-policy';
type ReadMode = 'success' | 'denied' | 'malformed';

/** Producer-owned read fixtures, not an authorization engine. A held response preserves its original facts to test late retirement. */
export async function installSimulatedRunAttemptBff(page: Page): Promise<{
  readonly reads: (runId: string) => number;
  readonly commands: () => number;
  readonly setOriginMode: (mode: ReadMode) => void;
  readonly setPredecessorMode: (mode: ReadMode) => void;
  readonly hideActiveRuns: () => void;
  readonly holdPredecessor: () => void;
  readonly releasePredecessor: () => void;
}> {
  const base = await installSimulatedRunSupervisionBff(page);
  const reads = new Map<string, number>();
  let originMode: ReadMode = 'success';
  let predecessorMode: ReadMode = 'success';
  let active = true;
  let held: Promise<void> | undefined;
  let release: (() => void) | undefined;
  await page.route('**/bff/v1/tenants/*/resolution-runs/assigned?*', (route) =>
    fulfillSimulatedBff(route, {
      entries: active
        ? [
            {
              runId: assignedRunId,
              caseId: simulatedRunSupervisionSnapshot.caseId,
              state: 'WAITING_FOR_APPROVAL',
              stateVersion: 0,
              stateUpdatedAt: simulatedRunSupervisionSnapshot.stateUpdatedAt,
              assignedAt: simulatedRunSupervisionSnapshot.assignedAt,
            },
          ]
        : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const runId = new URL(route.request().url()).pathname.split('/').at(-2);
      expect([assignedRunId, predecessorAttemptId]).toContain(runId);
      const isPredecessor = runId === predecessorAttemptId;
      const mode = isPredecessor ? predecessorMode : originMode;
      const key = isPredecessor ? predecessorAttemptId : assignedRunId;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      const wait = isPredecessor ? held : undefined;
      if (isPredecessor) held = undefined;
      if (wait) await wait;
      if (mode === 'denied')
        return fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            title: 'Assigned resolution run not found',
            status: 404,
          },
          404,
        );
      return fulfillSimulatedBff(route, {
        ...simulatedRunSupervisionSnapshot,
        runId: mode === 'malformed' ? 'invalid-id' : key,
        attemptNumber: isPredecessor ? 1 : 2,
        predecessorRunId: isPredecessor ? null : predecessorAttemptId,
        policyRevision: isPredecessor
          ? predecessorAttemptPolicy
          : originAttemptPolicy,
        state: isPredecessor ? 'SUPERSEDED' : 'WAITING_FOR_APPROVAL',
        stateVersion: isPredecessor ? 2 : 0,
        stateUpdatedAt: isPredecessor
          ? '2026-09-21T09:10:00Z'
          : simulatedRunSupervisionSnapshot.stateUpdatedAt,
      });
    },
  );
  return {
    reads: (runId) => reads.get(runId) ?? 0,
    commands: base.commands,
    setOriginMode: (mode) => {
      originMode = mode;
    },
    setPredecessorMode: (mode) => {
      predecessorMode = mode;
    },
    hideActiveRuns: () => {
      active = false;
    },
    holdPredecessor: () => {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releasePredecessor: () => {
      release?.();
      release = undefined;
    },
  };
}
