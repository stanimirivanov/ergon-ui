import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  assignedRunId,
  installSimulatedRunSupervisionBff,
  simulatedRunSupervisionSnapshot,
} from './simulated-run-supervision-bff';

export const successorAttemptId = '88888888-8888-4888-8888-888888888888';
export const sourceAttemptPolicy = 'SIMULATED_SOURCE_POLICY';
export const successorAttemptPolicy = 'SIMULATED_SUCCESSOR_POLICY';
type LinkMode = 'empty' | 'visible' | 'denied' | 'unsupported' | 'malformed';

/** Producer-owned synthetic wire records, never a retry/authorization engine. Held responses preserve their original observations. */
export async function installSimulatedRunSuccessorBff(page: Page): Promise<{
  readonly setLink: (mode: LinkMode) => void;
  readonly lookupReads: () => number;
  readonly consoleReads: (runId: string) => number;
  readonly commands: () => number;
  readonly showTerminalContext: () => void;
  readonly advanceTargetEpoch: () => void;
  readonly denySource: (denied: boolean) => void;
  readonly denyTarget: (denied: boolean) => void;
  readonly holdLookup: () => void;
  readonly releaseLookup: () => void;
  readonly holdTarget: () => void;
  readonly releaseTarget: () => void;
}> {
  const base = await installSimulatedRunSupervisionBff(page, {
    supervisionRevision: 3,
  });
  let mode: LinkMode = 'empty',
    lookups = 0,
    terminal = false,
    targetEpoch = 5;
  let sourceDenied = false,
    targetDenied = false;
  const reads = new Map<string, number>();
  let heldLookup: Promise<void> | undefined,
    releaseLookup: (() => void) | undefined;
  let heldTarget: Promise<void> | undefined,
    releaseTarget: (() => void) | undefined;
  const denied = {
    type: 'urn:ergon:problem:assigned-resolution-run-not-found',
  };
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/retry-successor',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const url = new URL(route.request().url());
      expect(url.search).toBe('');
      const runId = url.pathname.split('/').at(-2);
      expect([assignedRunId, successorAttemptId]).toContain(runId);
      lookups++;
      const selected = mode,
        epoch = targetEpoch,
        wait = heldLookup;
      heldLookup = undefined;
      if (wait) await wait;
      if (selected === 'denied') return fulfillSimulatedBff(route, denied, 404);
      if (selected === 'unsupported')
        return fulfillSimulatedBff(route, { type: 'about:blank' }, 404);
      return fulfillSimulatedBff(route, {
        observedAt: '2026-10-20T08:00:00.123456789Z',
        supervisionRevision: runId === assignedRunId ? 3 : epoch,
        successor:
          selected === 'empty' || runId === successorAttemptId
            ? null
            : {
                runId:
                  selected === 'malformed' ? assignedRunId : successorAttemptId,
                supervisionRevision: epoch,
              },
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const runId = new URL(route.request().url()).pathname.split('/').at(-2);
      expect([assignedRunId, successorAttemptId]).toContain(runId);
      const target = runId === successorAttemptId,
        key = target ? successorAttemptId : assignedRunId;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      const deniedRead = target ? targetDenied : sourceDenied,
        epoch = targetEpoch,
        isTerminal = terminal;
      const wait = target ? heldTarget : undefined;
      if (target) heldTarget = undefined;
      if (wait) await wait;
      if (deniedRead) return fulfillSimulatedBff(route, denied, 404);
      return fulfillSimulatedBff(route, {
        ...simulatedRunSupervisionSnapshot,
        runId: key,
        supervisionRevision: target ? epoch : 3,
        handoverSupported: false,
        policyRevision: target ? successorAttemptPolicy : sourceAttemptPolicy,
        attemptNumber: target ? 2 : 1,
        predecessorRunId: target ? assignedRunId : null,
        state: isTerminal
          ? target
            ? 'ESCALATED'
            : 'SUPERSEDED'
          : 'WAITING_FOR_APPROVAL',
        stateVersion: isTerminal ? 2 : 0,
        stateUpdatedAt: isTerminal
          ? '2026-10-20T07:59:00Z'
          : simulatedRunSupervisionSnapshot.stateUpdatedAt,
      });
    },
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/*/control', (route) => {
    expect(route.request().method()).toBe('GET');
    const target =
      new URL(route.request().url()).pathname.split('/').at(-2) ===
      successorAttemptId;
    return fulfillSimulatedBff(route, {
      status: terminal ? 'TERMINAL' : 'AVAILABLE',
      supervisionRevision: target ? targetEpoch : 3,
      observedAt: '2026-10-20T08:00:00Z',
    });
  });
  return {
    setLink: (next) => {
      mode = next;
    },
    lookupReads: () => lookups,
    consoleReads: (id) => reads.get(id) ?? 0,
    commands: base.commands,
    showTerminalContext: () => {
      terminal = true;
      base.setActiveRunsVisible(false);
    },
    advanceTargetEpoch: () => {
      targetEpoch++;
    },
    denySource: (next) => {
      sourceDenied = next;
    },
    denyTarget: (next) => {
      targetDenied = next;
    },
    holdLookup: () => {
      if (releaseLookup) throw new Error('Lookup already held');
      heldLookup = new Promise((resolve) => {
        releaseLookup = resolve;
      });
    },
    releaseLookup: () => {
      if (!releaseLookup) throw new Error('No lookup held');
      releaseLookup();
      releaseLookup = undefined;
    },
    holdTarget: () => {
      if (releaseTarget) throw new Error('Target already held');
      heldTarget = new Promise((resolve) => {
        releaseTarget = resolve;
      });
    },
    releaseTarget: () => {
      if (!releaseTarget) throw new Error('No target held');
      releaseTarget();
      releaseTarget = undefined;
    },
  };
}
