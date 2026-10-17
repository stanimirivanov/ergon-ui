import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  assignedRunId,
  simulatedRunSupervisionSnapshot,
  installSimulatedRunSupervisionBff,
} from './simulated-run-supervision-bff';

export const retrySuccessorId = '44444444-4444-4444-8444-444444444444';
export const retryOriginalPolicy = 'ergon.dev/policy/access-restoration/v1';
export const retryCurrentPolicy = 'ergon.dev/policy/access-restoration/v2';
const at = '2026-10-17T08:00:00Z';
const failedAt = '2026-10-17T08:03:00Z';
const successorAt = '2026-10-17T08:04:00Z';
const retryPolicy = 'ergon.dev/policy/resolution-retry/v1';

/** Producer-owned wire audit, independent of the consuming TypeScript contracts. */
export interface SimulatedRetryIntent {
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
  readonly retryPolicyRevision: string;
  readonly maximumAttempts: number;
  readonly plan: {
    readonly caseStreamVersion: number;
    readonly contractKey: string;
    readonly contractRevision: number;
    readonly policyRevision: string;
    readonly stepId: string;
    readonly capability: string;
    readonly effectiveRisk: string;
    readonly requiredApproval: string;
  };
}

/** Controlled protocol checkpoints only, not an authority engine, database transaction or provider. All responses are marked synthetic. */
export async function installSimulatedRunRetryBff(page: Page): Promise<{
  readonly setEnabled: (value: boolean) => void;
  readonly setSupported: (value: boolean) => void;
  readonly setNext: (
    value: 'success' | 'conflict' | 'lost-committed' | 'lost-uncommitted',
  ) => void;
  readonly setReadAccess: (value: boolean) => void;
  readonly denyReview: () => void;
  readonly malformedReview: () => void;
  readonly failSuccessor: () => void;
  readonly intents: () => readonly SimulatedRetryIntent[];
  readonly successorCreations: () => number;
  readonly reviewReads: () => number;
  readonly holdCommand: () => void;
  readonly releaseCommand: () => void;
  readonly holdNextRead: () => void;
  readonly releaseRead: () => void;
}> {
  await installSimulatedRunSupervisionBff(page);
  let enabled = false;
  let supported = true;
  let canRead = true;
  let reviewDenied = false;
  let invalidReview = false;
  let caseVersion = 4;
  let stage: 'predecessor' | 'successor' | 'successor-failed' = 'predecessor';
  let next: 'success' | 'conflict' | 'lost-committed' | 'lost-uncommitted' =
    'success';
  let creations = 0;
  let reads = 0;
  const intents: SimulatedRetryIntent[] = [];
  let recorded:
    | { readonly intent: SimulatedRetryIntent; readonly receipt: object }
    | undefined;
  let commandWait: Promise<void> | undefined;
  let releaseCommand: (() => void) | undefined;
  let readWait: Promise<void> | undefined;
  let releaseRead: (() => void) | undefined;
  const plan = () => ({
    caseStreamVersion: caseVersion,
    contractKey: simulatedRunSupervisionSnapshot.contractKey,
    contractRevision: simulatedRunSupervisionSnapshot.contractRevision,
    policyRevision: retryCurrentPolicy,
    stepId: 'restore-access',
    capability: 'identity.account.unlock',
    effectiveRisk: 'HIGH',
    requiredApproval: 'RESOLVER',
  });

  function snapshot(runId: string): object {
    const successor = runId === retrySuccessorId;
    const isFailed = !successor || stage === 'successor-failed';
    const superseded = !successor && stage !== 'predecessor';
    const completed = successor ? '2026-10-17T08:06:00Z' : failedAt;
    const state = superseded
      ? 'SUPERSEDED'
      : isFailed
        ? 'ACTION_FAILED'
        : 'WAITING_FOR_APPROVAL';
    return {
      ...simulatedRunSupervisionSnapshot,
      runId,
      stepId: 'restore-access',
      capability: 'identity.account.unlock',
      policyRevision: successor ? retryCurrentPolicy : retryOriginalPolicy,
      caseEvidenceStreamVersion: successor ? caseVersion : 4,
      attemptNumber: successor ? 2 : 1,
      predecessorRunId: successor ? assignedRunId : null,
      startedRecordedAt: successor
        ? successorAt
        : simulatedRunSupervisionSnapshot.startedRecordedAt,
      assignedAt: successor
        ? successorAt
        : simulatedRunSupervisionSnapshot.assignedAt,
      supervisionRevision: 0,
      handoverSupported: false,
      state,
      stateVersion: superseded ? 2 : isFailed ? 1 : 0,
      stateUpdatedAt: superseded
        ? successorAt
        : isFailed
          ? completed
          : successorAt,
      execution: isFailed
        ? {
            stepId: 'restore-access',
            capability: 'identity.account.unlock',
            connector: 'synthetic-identity-gateway',
            outcome: 'FAILED',
            completedAt: completed,
            recordedAt: completed,
            timing: null,
          }
        : null,
      transitions: isFailed
        ? [
            {
              sequence: 1,
              type: 'CAPABILITY_FAILED',
              fromState: 'WAITING_FOR_APPROVAL',
              toState: 'ACTION_FAILED',
              occurredAt: completed,
              recordedAt: completed,
            },
            ...(superseded
              ? [
                  {
                    sequence: 2,
                    type: 'RETRY_STARTED',
                    fromState: 'ACTION_FAILED',
                    toState: 'SUPERSEDED',
                    occurredAt: successorAt,
                    recordedAt: successorAt,
                  },
                ]
              : []),
          ]
        : [],
      approvalReview: successor
        ? {
            status: 'NOT_REQUESTED',
            observedAt: at,
            canDecide: false,
            request: null,
            decision: null,
          }
        : {
            status: 'DECIDED',
            observedAt: at,
            canDecide: false,
            request: {
              requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              authority: 'RESOLVER',
              requestedAt: at,
              expiresAt: '2026-10-17T08:15:00Z',
              recordedAt: at,
            },
            decision: {
              decisionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              outcome: 'APPROVED',
              decidedAt: at,
              recordedAt: at,
            },
          },
    };
  }
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-retry-csrf',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/assigned?*',
    (route) => {
      const runId = stage === 'predecessor' ? assignedRunId : retrySuccessorId;
      const failed = stage !== 'successor';
      return fulfillSimulatedBff(route, {
        entries: canRead
          ? [
              {
                runId,
                caseId: simulatedRunSupervisionSnapshot.caseId,
                state: failed ? 'ACTION_FAILED' : 'WAITING_FOR_APPROVAL',
                stateVersion: failed ? 1 : 0,
                stateUpdatedAt: failed
                  ? stage === 'predecessor'
                    ? failedAt
                    : '2026-10-17T08:06:00Z'
                  : successorAt,
                assignedAt:
                  stage === 'predecessor'
                    ? simulatedRunSupervisionSnapshot.assignedAt
                    : successorAt,
                supervisionRevision: 0,
              },
            ]
          : [],
        nextCursor: null,
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      const held = readWait;
      readWait = undefined;
      if (held !== undefined) await held;
      const runId = new URL(route.request().url()).pathname.split('/').at(-2);
      const available =
        canRead &&
        (runId === assignedRunId ||
          (runId === retrySuccessorId && stage !== 'predecessor'));
      await fulfillSimulatedBff(
        route,
        available && runId !== undefined
          ? snapshot(runId)
          : { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
        available ? 200 : 404,
      );
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/retry-review',
    (route) => {
      reads += 1;
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
      const successor = new URL(route.request().url()).pathname.includes(
        retrySuccessorId,
      );
      const eligible = !successor && stage === 'predecessor';
      return fulfillSimulatedBff(route, {
        supported: enabled,
        observedAt: at,
        supervisionRevision: 0,
        runVersion: 1,
        attemptNumber: successor ? 2 : 1,
        retryPolicyRevision: retryPolicy,
        maximumAttempts: 2,
        canRetry: enabled && eligible,
        reason: !enabled
          ? 'DISABLED'
          : successor
            ? 'ATTEMPT_LIMIT_REACHED'
            : eligible
              ? null
              : 'RUN_NOT_FAILED',
        plan: eligible && !invalidReview ? plan() : null,
        authorityEvidenceId: 'PRIVATE_SERVER_EXTRA',
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/retry-commands',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-retry-csrf',
      );
      const intent: SimulatedRetryIntent = route.request().postDataJSON();
      intents.push(intent);
      // These assertions run at network acquisition, not after an eventually
      // hidden DOM: a synchronous response must not expose stale private facts.
      expect(await page.getByRole('dialog').count()).toBe(0);
      expect(
        await page.getByText(retryOriginalPolicy, { exact: true }).count(),
      ).toBe(0);
      expect(
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .count(),
      ).toBe(0);
      const held = commandWait;
      commandWait = undefined;
      if (held !== undefined) await held;
      if (
        recorded !== undefined &&
        recorded.intent.commandId === intent.commandId
      ) {
        expect(intent).toEqual(recorded.intent);
        return fulfillSimulatedBff(route, recorded.receipt);
      }
      expect(intent).toEqual({
        commandId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        expectedSupervisionRevision: 0,
        expectedRunVersion: 1,
        retryPolicyRevision: retryPolicy,
        maximumAttempts: 2,
        plan: plan(),
      });
      const response = next;
      next = 'success';
      if (response === 'conflict') {
        caseVersion += 1;
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-retry-conflict' },
          409,
        );
      }
      if (response === 'lost-uncommitted') return route.abort('failed');
      if (!enabled || stage !== 'predecessor')
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-retry-conflict' },
          409,
        );
      const receipt = {
        commandId: intent.commandId,
        runId: assignedRunId,
        successorRunId: retrySuccessorId,
        supervisionRevision: 0,
        expectedRunVersion: 1,
        caseStreamVersion: intent.plan.caseStreamVersion,
        retryPolicyRevision: retryPolicy,
        sourceAttemptNumber: 1,
        maximumAttempts: 2,
        startedAt: successorAt,
        recordedAt: '2026-10-17T08:04:00.123456Z',
      };
      recorded = { intent, receipt };
      creations += 1;
      stage = 'successor';
      if (response === 'lost-committed') return route.abort('failed');
      return fulfillSimulatedBff(route, receipt, 201);
    },
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
    setReadAccess: (value) => {
      canRead = value;
    },
    denyReview: () => {
      reviewDenied = true;
    },
    malformedReview: () => {
      invalidReview = true;
    },
    failSuccessor: () => {
      stage = 'successor-failed';
    },
    intents: () => intents,
    successorCreations: () => creations,
    reviewReads: () => reads,
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
