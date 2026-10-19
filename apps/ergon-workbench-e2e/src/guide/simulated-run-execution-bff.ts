import { installDisabledRunControl } from './simulated-disabled-run-control';
import { expect, type Page, type Route } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  assignedRunId,
  simulatedRunSupervisionSnapshot,
  installSimulatedRunSupervisionBff,
} from './simulated-run-supervision-bff';

/** Producer-owned wire audit, deliberately independent of the consuming command/receipt types. */
export interface SimulatedExecutionIntent {
  readonly kind: 'execute' | 'resume';
  readonly commandId: string;
  readonly attemptId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
  readonly requestId: string | null;
  readonly decisionId: string | null;
}
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const decisionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const at = '2026-10-16T08:00:00Z';
type Stage = 'none' | 'incomplete' | 'receipt' | 'completed';

/** Marked synthetic protocol checkpoints, not an authorization engine or real provider. Explicit attempts count dispatches; original replay never does. */
export async function installSimulatedRunExecutionBff(page: Page): Promise<{
  readonly setEnabled: (value: boolean) => void;
  readonly setSupported: (value: boolean) => void;
  readonly setNext: (
    value: 'lost' | 'incomplete' | 'receipt' | 'completed' | 'conflict',
  ) => void;
  readonly advanceEpoch: () => void;
  readonly intents: () => readonly SimulatedExecutionIntent[];
  readonly dispatches: () => number;
  readonly reviewReads: () => number;
  readonly holdCommand: () => void;
  readonly releaseCommand: () => void;
  readonly denyReview: () => void;
  readonly holdRead: () => void;
  readonly releaseRead: () => void;
  readonly denyReads: () => void;
}> {
  await installSimulatedRunSupervisionBff(page);
  let enabled = false;
  let supported = true;
  let epoch = 0;
  await installDisabledRunControl(page, () => epoch);
  let stage: Stage = 'none';
  let denied = false;
  let reviewDenied = false;
  let reviewReads = 0;
  let dispatches = 0;
  let next: 'lost' | 'incomplete' | 'receipt' | 'completed' | 'conflict' =
    'incomplete';
  const intents: SimulatedExecutionIntent[] = [];
  let original: SimulatedExecutionIntent | undefined;
  const attempts = new Map<string, SimulatedExecutionIntent>();
  let commandWait: Promise<void> | undefined;
  let releaseCommand: (() => void) | undefined;
  let readWait: Promise<void> | undefined;
  let releaseRead: (() => void) | undefined;
  const completedAt = '2026-10-16T08:04:00Z';
  const recordedAt = '2026-10-16T08:04:01Z';
  function snapshot(): object {
    const projected = stage === 'completed';
    return {
      ...simulatedRunSupervisionSnapshot,
      stepId: 'restore-access',
      capability: 'identity.account.unlock',
      policyRevision: 'synthetic-execution-policy',
      supervisionRevision: epoch,
      handoverSupported: false,
      state: projected ? 'VERIFYING' : 'WAITING_FOR_APPROVAL',
      stateVersion: projected ? 1 : 0,
      stateUpdatedAt: projected
        ? completedAt
        : simulatedRunSupervisionSnapshot.stateUpdatedAt,
      approvalReview: {
        status: 'DECIDED',
        observedAt: '2026-10-16T08:02:00Z',
        canDecide: false,
        request: {
          requestId,
          authority: 'RESOLVER',
          requestedAt: at,
          expiresAt: '2026-10-16T08:15:00Z',
          recordedAt: at,
        },
        decision: {
          decisionId,
          outcome: 'APPROVED',
          decidedAt: '2026-10-16T08:01:00Z',
          recordedAt: '2026-10-16T08:01:01Z',
        },
      },
      execution:
        stage === 'receipt' || projected
          ? {
              stepId: 'restore-access',
              capability: 'identity.account.unlock',
              connector: 'synthetic-identity-gateway',
              outcome: 'SUCCEEDED',
              completedAt,
              recordedAt,
              timing: null,
            }
          : null,
      transitions: projected
        ? [
            {
              sequence: 1,
              type: 'CAPABILITY_SUCCEEDED',
              fromState: 'WAITING_FOR_APPROVAL',
              toState: 'VERIFYING',
              occurredAt: completedAt,
              recordedAt,
            },
          ]
        : [],
    };
  }
  function acknowledgement(intent: SimulatedExecutionIntent): object {
    return {
      commandId: intent.commandId,
      attemptId: intent.attemptId,
      runId: assignedRunId,
      admittedRecordedAt: '2026-10-16T08:03:00Z',
      status:
        stage === 'completed'
          ? 'COMPLETED'
          : stage === 'receipt'
            ? 'RESULT_RECORDED'
            : 'INCOMPLETE',
      outcome: stage === 'completed' ? 'SUCCEEDED' : null,
      resultingState: stage === 'completed' ? 'VERIFYING' : null,
      runSequence: stage === 'completed' ? 1 : null,
      completedAt: stage === 'completed' ? completedAt : null,
      resultRecordedAt: stage === 'completed' ? recordedAt : null,
    };
  }
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-execution-csrf',
    }),
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/assigned?*', (route) =>
    fulfillSimulatedBff(route, {
      entries: [
        {
          runId: assignedRunId,
          caseId: simulatedRunSupervisionSnapshot.caseId,
          state: stage === 'completed' ? 'VERIFYING' : 'WAITING_FOR_APPROVAL',
          stateVersion: stage === 'completed' ? 1 : 0,
          stateUpdatedAt:
            stage === 'completed'
              ? completedAt
              : simulatedRunSupervisionSnapshot.stateUpdatedAt,
          assignedAt: simulatedRunSupervisionSnapshot.assignedAt,
          supervisionRevision: epoch,
        },
      ],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      const held = readWait;
      readWait = undefined;
      if (held !== undefined) await held;
      await fulfillSimulatedBff(
        route,
        denied
          ? { type: 'urn:ergon:problem:assigned-resolution-run-not-found' }
          : snapshot(),
        denied ? 404 : 200,
      );
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/execution-review',
    (route) => {
      reviewReads += 1;
      if (!supported)
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:route-not-found' },
          404,
        );
      if (reviewDenied)
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
          404,
        );
      return fulfillSimulatedBff(route, {
        supported: enabled,
        observedAt: '2026-10-16T08:02:00Z',
        supervisionRevision: epoch,
        runVersion: stage === 'completed' ? 1 : 0,
        requestId,
        decisionId,
        commandId: original?.commandId ?? null,
        canExecute: enabled && stage === 'none',
        canResume: enabled && original !== undefined && stage !== 'completed',
      });
    },
  );
  async function command(route: Route, resuming: boolean): Promise<void> {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-csrf-token']).toBe(
      'synthetic-execution-csrf',
    );
    const input: unknown = route.request().postDataJSON();
    if (typeof input !== 'object' || input === null)
      throw new Error('Expected synthetic command object');
    const readString = (key: string): string => {
      const value: unknown = Reflect.get(input, key);
      if (typeof value !== 'string')
        throw new Error('Missing synthetic string coordinate');
      return value;
    };
    const readNumber = (key: string): number => {
      const value: unknown = Reflect.get(input, key);
      if (typeof value !== 'number')
        throw new Error('Missing synthetic revision');
      return value;
    };
    const pathCommand = new URL(route.request().url()).pathname
      .split('/')
      .at(-2);
    const commandId = resuming ? pathCommand : readString('commandId');
    if (commandId === undefined)
      throw new Error('Missing synthetic command path');
    const intent: SimulatedExecutionIntent = {
      kind: resuming ? 'resume' : 'execute',
      commandId,
      attemptId: resuming ? readString('attemptId') : commandId,
      expectedSupervisionRevision: readNumber('expectedSupervisionRevision'),
      expectedRunVersion: readNumber('expectedRunVersion'),
      requestId: resuming ? null : readString('requestId'),
      decisionId: resuming ? null : readString('decisionId'),
    };
    intents.push(intent);
    const held = commandWait;
    commandWait = undefined;
    if (held !== undefined) await held;
    const existing = attempts.get(intent.attemptId);
    if (existing !== undefined) {
      expect(intent).toEqual(existing);
      await fulfillSimulatedBff(
        route,
        acknowledgement(intent),
        stage === 'completed' ? 200 : 202,
      );
      return;
    }
    const result = next;
    next = 'incomplete';
    if (result === 'conflict' || intent.expectedSupervisionRevision !== epoch) {
      epoch += 1;
      await fulfillSimulatedBff(
        route,
        { type: 'urn:ergon:problem:run-execution-conflict' },
        409,
      );
      return;
    }
    expect(enabled).toBe(true);
    expect(intent.expectedRunVersion).toBe(0);
    if (resuming) {
      expect(original?.commandId).toBe(intent.commandId);
      expect(intent.attemptId).not.toBe(intent.commandId);
    } else {
      expect(original).toBeUndefined();
      expect(intent.requestId).toBe(requestId);
      expect(intent.decisionId).toBe(decisionId);
      original = intent;
    }
    attempts.set(intent.attemptId, intent);
    // A known terminal receipt needs projection repair only, not another call.
    if (stage !== 'receipt') dispatches += 1;
    stage =
      result === 'completed'
        ? 'completed'
        : result === 'receipt'
          ? 'receipt'
          : 'incomplete';
    if (result === 'lost') await route.abort('failed');
    else
      await fulfillSimulatedBff(
        route,
        acknowledgement(intent),
        stage === 'completed' ? 200 : 202,
      );
  }
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/execution-commands',
    (route) => command(route, false),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/execution-commands/*/attempts',
    (route) => command(route, true),
  );
  return {
    setEnabled: (value) => {
      enabled = value;
    },
    setSupported: (value) => {
      supported = value;
    },
    setNext: (value) => {
      next = value;
    },
    advanceEpoch: () => {
      epoch += 1;
    },
    intents: () => intents,
    dispatches: () => dispatches,
    reviewReads: () => reviewReads,
    holdCommand: () => {
      commandWait = new Promise((resolve) => {
        releaseCommand = resolve;
      });
    },
    releaseCommand: () => {
      if (releaseCommand === undefined)
        throw new Error('No held synthetic command');
      releaseCommand();
      releaseCommand = undefined;
    },
    denyReview: () => {
      reviewDenied = true;
    },
    holdRead: () => {
      readWait = new Promise((resolve) => {
        releaseRead = resolve;
      });
    },
    releaseRead: () => {
      if (releaseRead === undefined) throw new Error('No held synthetic read');
      releaseRead();
      releaseRead = undefined;
    },
    denyReads: () => {
      denied = true;
    },
  };
}
