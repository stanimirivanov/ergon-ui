import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import { installDisabledRunControl } from './simulated-disabled-run-control';
import {
  assignedRunId,
  simulatedRunSupervisionSnapshot,
  installSimulatedRunSupervisionBff,
} from './simulated-run-supervision-bff';

export const escalationWorkId = '66666666-6666-4666-8666-666666666666';
export const escalationPrivatePolicy = 'synthetic-private-failed-policy';
const eventId = '77777777-7777-4777-8777-777777777777';
const policy = 'ergon.dev/policy/resolution-retry/v1';
const failedAt = '2026-10-18T08:02:00Z';
const escalatedAt = '2026-10-18T08:03:00Z';
interface EscalationIntent {
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
  readonly sourceAttemptNumber: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly reason: string;
}
type NextCommand =
  'success' | 'conflict' | 'lost-committed' | 'lost-uncommitted';

/** Producer-owned protocol fixture, not an authority engine or database. Held responses expose browser ordering; counters describe only simulated checkpoints. */
export async function installSimulatedRunEscalationBff(page: Page): Promise<{
  readonly setEnabled: (value: boolean) => void;
  readonly setReviewMode: (
    value:
      'supported' | 'unsupported' | 'denied' | 'malformed' | 'remaining-budget',
  ) => void;
  readonly setNext: (value: NextCommand) => void;
  readonly setReadAccess: (value: boolean) => void;
  readonly intents: () => readonly EscalationIntent[];
  readonly creations: () => number;
  readonly commands: () => number;
  readonly reviews: () => number;
  readonly holdCommand: () => void;
  readonly releaseCommand: () => void;
  readonly holdNextRead: () => void;
  readonly releaseRead: () => void;
}> {
  const base = await installSimulatedRunSupervisionBff(page);
  let enabled = false;
  let reviewMode:
    'supported' | 'unsupported' | 'denied' | 'malformed' | 'remaining-budget' =
    'supported';
  let next: NextCommand = 'success';
  let canRead = true;
  let escalated = false;
  let supervisionRevision = 0;
  await installDisabledRunControl(page, () => supervisionRevision);
  let creations = 0;
  let reviews = 0;
  const intents: EscalationIntent[] = [];
  let recorded:
    { readonly intent: EscalationIntent; readonly receipt: object } | undefined;
  let commandWait: Promise<void> | undefined;
  let releaseCommand: (() => void) | undefined;
  let readWait: Promise<void> | undefined;
  let releaseRead: (() => void) | undefined;
  const attemptNumber = () => (reviewMode === 'remaining-budget' ? 1 : 2);
  const failedTransition = {
    sequence: 1,
    type: 'CAPABILITY_FAILED',
    fromState: 'WAITING_FOR_APPROVAL',
    toState: 'ACTION_FAILED',
    occurredAt: failedAt,
    recordedAt: failedAt,
  };
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-escalation-csrf',
    }),
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/assigned?*', (route) =>
    fulfillSimulatedBff(route, {
      entries:
        canRead && !escalated
          ? [
              {
                runId: assignedRunId,
                caseId: simulatedRunSupervisionSnapshot.caseId,
                state: 'ACTION_FAILED',
                stateVersion: 1,
                stateUpdatedAt: failedAt,
                assignedAt: simulatedRunSupervisionSnapshot.assignedAt,
                supervisionRevision,
              },
            ]
          : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      const wait = readWait;
      readWait = undefined;
      if (wait) await wait;
      if (!canRead)
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
          404,
        );
      return fulfillSimulatedBff(route, {
        ...simulatedRunSupervisionSnapshot,
        supervisionRevision,
        handoverSupported: false,
        policyRevision: escalationPrivatePolicy,
        attemptNumber: attemptNumber(),
        predecessorRunId:
          attemptNumber() === 2 ? '44444444-4444-4444-8444-444444444444' : null,
        state: escalated ? 'ESCALATED' : 'ACTION_FAILED',
        stateVersion: escalated ? 2 : 1,
        stateUpdatedAt: escalated ? escalatedAt : failedAt,
        execution: {
          stepId: simulatedRunSupervisionSnapshot.stepId,
          capability: simulatedRunSupervisionSnapshot.capability,
          connector: 'synthetic-identity-gateway',
          outcome: 'FAILED',
          completedAt: failedAt,
          recordedAt: failedAt,
          timing: null,
        },
        transitions: [
          failedTransition,
          ...(escalated
            ? [
                {
                  sequence: 2,
                  type: 'ESCALATION_REQUESTED',
                  fromState: 'ACTION_FAILED',
                  toState: 'ESCALATED',
                  occurredAt: escalatedAt,
                  recordedAt: escalatedAt,
                },
              ]
            : []),
        ],
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/escalation-review',
    (route) => {
      reviews += 1;
      if (reviewMode === 'unsupported')
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:route-not-found' },
          404,
        );
      if (reviewMode === 'denied')
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
          404,
        );
      const eligible =
        enabled && reviewMode !== 'remaining-budget' && !escalated;
      return fulfillSimulatedBff(route, {
        supported: enabled,
        observedAt: failedAt,
        supervisionRevision,
        runVersion: escalated ? 2 : 1,
        attemptNumber: attemptNumber(),
        retryPolicyRevision: policy,
        maximumAttempts: 2,
        canEscalate: eligible,
        reason: !enabled
          ? 'DISABLED'
          : escalated
            ? 'RUN_NOT_FAILED'
            : eligible
              ? 'RETRY_ATTEMPT_LIMIT_REACHED'
              : 'RETRY_BUDGET_AVAILABLE',
        followUpQueueKey:
          reviewMode === 'malformed' ? 'arbitrary-queue' : 'access-restoration',
        authorityEvidenceId: 'PRIVATE_SERVER_EXTRA',
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/escalation-commands',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-escalation-csrf',
      );
      const intent: EscalationIntent = route.request().postDataJSON();
      intents.push(intent);
      expect(await page.getByRole('dialog').count()).toBe(0);
      expect(
        await page.getByText(escalationPrivatePolicy, { exact: true }).count(),
      ).toBe(0);
      expect(
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .count(),
      ).toBe(0);
      const wait = commandWait;
      commandWait = undefined;
      if (wait) await wait;
      if (recorded?.intent.commandId === intent.commandId) {
        expect(intent).toEqual(recorded.intent);
        return fulfillSimulatedBff(route, recorded.receipt);
      }
      expect(intent).toEqual({
        commandId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        expectedSupervisionRevision: supervisionRevision,
        expectedRunVersion: 1,
        sourceAttemptNumber: attemptNumber(),
        retryPolicyRevision: policy,
        maximumAttempts: 2,
        reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
      });
      const response = next;
      next = 'success';
      if (response === 'conflict') {
        supervisionRevision += 1;
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-escalation-conflict' },
          409,
        );
      }
      if (response === 'lost-uncommitted') return route.abort('failed');
      expect(enabled && !escalated).toBe(true);
      const receipt = {
        commandId: intent.commandId,
        runId: assignedRunId,
        supervisionRevision,
        expectedRunVersion: 1,
        sourceAttemptNumber: 2,
        retryPolicyRevision: policy,
        maximumAttempts: 2,
        reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
        escalationEventId: eventId,
        followUpWorkItemId: escalationWorkId,
        followUpQueueKey: 'access-restoration',
        creationStatus: 'OPEN',
        requestedAt: escalatedAt,
        recordedAt: escalatedAt,
      };
      recorded = { intent, receipt };
      escalated = true;
      creations += 1;
      if (response === 'lost-committed') return route.abort('failed');
      return fulfillSimulatedBff(route, receipt, 201);
    },
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillSimulatedBff(route, {
      items: escalated
        ? [
            {
              workItemId: escalationWorkId,
              caseId: simulatedRunSupervisionSnapshot.caseId,
              runId: assignedRunId,
              escalationEventId: eventId,
              reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
              queueKey: 'access-restoration',
              status: 'OPEN',
              priority: 'NORMAL' as const,
              priorityRevision: 0,
              openedAt: escalatedAt,
              recordedAt: escalatedAt,
              ownershipRevision: 0,
            },
          ]
        : [],
      nextCursor: null,
    }),
  );
  return {
    setEnabled: (value) => {
      enabled = value;
    },
    setReviewMode: (value) => {
      reviewMode = value;
    },
    setNext: (value) => {
      next = value;
    },
    setReadAccess: (value) => {
      canRead = value;
    },
    intents: () => intents,
    creations: () => creations,
    commands: () => base.commands(),
    reviews: () => reviews,
    holdCommand: () => {
      commandWait = new Promise<void>((resolve) => {
        releaseCommand = resolve;
      });
    },
    releaseCommand: () => releaseCommand?.(),
    holdNextRead: () => {
      readWait = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
    },
    releaseRead: () => releaseRead?.(),
  };
}
