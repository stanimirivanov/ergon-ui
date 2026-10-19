import { installDisabledRunControl } from './simulated-disabled-run-control';
import { expect, type Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

export const assignedRunId = '33333333-3333-4333-8333-333333333333';
export const assignedCaseId = '22222222-2222-4222-8222-222222222222';
export const supervisorTenantPath =
  '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';

const snapshot = {
  runId: assignedRunId,
  caseId: assignedCaseId,
  caseEvidenceStreamVersion: 4,
  contractKey: 'access-restoration',
  contractRevision: 2,
  policyRevision: 'policy-7',
  stepId: 'verify-account-owner',
  capability: 'identity.lookup',
  effectiveRisk: 'HIGH',
  requiredApproval: 'RESOLVER',
  attemptNumber: 1,
  predecessorRunId: null,
  startedRecordedAt: '2026-09-21T09:00:00Z',
  state: 'WAITING_FOR_APPROVAL',
  stateVersion: 0,
  stateUpdatedAt: '2026-09-21T09:00:00Z',
  assignedAt: '2026-09-21T09:02:00Z',
} as const;

/** Shared synthetic start for the supervision and pinned-evidence recordings; never production data. */
export const simulatedRunSupervisionSnapshot = snapshot;

type RunReadMode =
  'success' | 'projected' | 'failure' | 'terminal' | 'not-found';
type ExecutionMode =
  'measured' | 'zero' | 'historical-failure' | 'no-receipt' | 'legacy';

function executionProjection(mode: ExecutionMode): object {
  if (mode === 'legacy') return {};
  if (mode === 'no-receipt') return { execution: null };
  return {
    execution: {
      stepId: snapshot.stepId,
      capability: snapshot.capability,
      connector: 'synthetic-identity-gateway',
      outcome: mode === 'historical-failure' ? 'FAILED' : 'SUCCEEDED',
      completedAt: '2026-09-21T09:10:00Z',
      recordedAt: '2026-09-21T09:10:01Z',
      timing:
        mode === 'historical-failure'
          ? null
          : {
              source: 'ergon.dev/measurement/connector-call/v1',
              // Demonstrate valid wall-clock correction, never inferred duration.
              startedAt: '2026-09-21T09:10:02Z',
              elapsedNanoseconds: mode === 'zero' ? '0' : '305123456',
            },
    },
  };
}

/**
 * Controls marked synthetic reads only; no assignment or execution is performed.
 * Holding one detail request lets assertions observe the stale-payload boundary.
 * Release it deliberately before finishing a scenario. Failure mode persists
 * across the client's bounded automatic read retries until explicitly changed.
 */
export async function installSimulatedRunSupervisionBff(page: Page): Promise<{
  assignedReads: () => number;
  consoleReads: () => number;
  commands: () => number;
  showPagedAssignments: () => void;
  rejectNextAssignedPage: () => void;
  assignedCursors: () => readonly {
    assignedAt: string | null;
    assignmentId: string | null;
  }[];
  setRunReadMode: (mode: RunReadMode) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setActiveRunsVisible: (visible: boolean) => void;
  holdNextRunRead: () => void;
  releaseHeldRunRead: (mode: RunReadMode) => void;
}> {
  await installDisabledRunControl(page);
  let assignedReads = 0;
  let consoleReads = 0;
  let commands = 0;
  let activeRunsVisible = true;
  let hasNextAssignedPage = false;
  let rejectAssignedCursor = false;
  const cursors: { assignedAt: string | null; assignmentId: string | null }[] =
    [];
  let mode: RunReadMode = 'success';
  let executionMode: ExecutionMode = 'measured';
  let heldRead: Promise<void> | undefined;
  let releaseRead: (() => void) | undefined;

  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/bff/') &&
      request.method() !== 'GET'
    ) {
      commands += 1;
    }
  });
  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'workforce-sso',
      registeredAt: '2026-09-20T12:34:56Z',
      recordedAt: '2026-09-20T12:34:57Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/assigned?*',
    (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${supervisorTenantPath}/resolution-runs/assigned`,
      );
      assignedReads += 1;
      const search = new URL(route.request().url()).searchParams;
      const cursor = {
        assignedAt: search.get('afterAssignedAt'),
        assignmentId: search.get('afterAssignmentId'),
      };
      cursors.push(cursor);
      if (rejectAssignedCursor && cursor.assignmentId !== null) {
        return fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:invalid-assigned-resolution-run-page',
            title: 'Invalid assigned resolution run page',
            status: 400,
          },
          400,
        );
      }
      return fulfillSimulatedBff(route, {
        entries: activeRunsVisible
          ? [
              {
                runId: snapshot.runId,
                caseId: snapshot.caseId,
                state: snapshot.state,
                stateVersion: snapshot.stateVersion,
                stateUpdatedAt: snapshot.stateUpdatedAt,
                assignedAt: snapshot.assignedAt,
              },
            ]
          : [],
        nextCursor:
          hasNextAssignedPage && cursor.assignmentId === null
            ? {
                assignedAt: snapshot.assignedAt,
                assignmentId: '55555555-5555-4555-8555-555555555555',
              }
            : null,
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${supervisorTenantPath}/resolution-runs/${assignedRunId}/console`,
      );
      consoleReads += 1;
      const pending = heldRead;
      heldRead = undefined;
      if (pending !== undefined) await pending;
      if (mode === 'failure') {
        await fulfillSimulatedBff(
          route,
          {
            type: 'about:blank',
            title: 'Synthetic service failure',
            status: 503,
          },
          503,
        );
        return;
      }
      if (mode === 'not-found') {
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            title: 'Assigned resolution run not found',
            status: 404,
          },
          404,
        );
        return;
      }
      await fulfillSimulatedBff(
        route,
        mode === 'terminal'
          ? {
              ...snapshot,
              ...executionProjection(executionMode),
              state: 'VERIFIED_RESOLVED',
              stateVersion: 2,
              stateUpdatedAt: '2026-09-21T09:15:00Z',
              transitions: [
                {
                  sequence: 1,
                  type: 'CAPABILITY_SUCCEEDED',
                  fromState: snapshot.state,
                  toState: 'VERIFYING',
                  occurredAt: '2026-09-21T09:10:00Z',
                  recordedAt: '2026-09-21T09:10:01Z',
                },
                {
                  sequence: 2,
                  type: 'OUTCOME_PROOF_ACCEPTED',
                  fromState: 'VERIFYING',
                  toState: 'VERIFIED_RESOLVED',
                  occurredAt: '2026-09-21T09:15:00Z',
                  recordedAt: '2026-09-21T09:15:01Z',
                },
              ],
            }
          : mode === 'projected'
            ? {
                ...snapshot,
                ...executionProjection(executionMode),
                state: 'VERIFYING',
                stateVersion: 1,
                stateUpdatedAt: '2026-09-21T09:10:00Z',
                transitions: [
                  {
                    sequence: 1,
                    type: 'CAPABILITY_SUCCEEDED',
                    fromState: snapshot.state,
                    toState: 'VERIFYING',
                    occurredAt: '2026-09-21T09:10:00Z',
                    recordedAt: '2026-09-21T09:10:01Z',
                  },
                ],
              }
            : {
                ...snapshot,
                ...executionProjection(executionMode),
                ...(executionMode === 'legacy' ? {} : { transitions: [] }),
              },
      );
    },
  );

  return {
    assignedReads: () => assignedReads,
    consoleReads: () => consoleReads,
    commands: () => commands,
    showPagedAssignments: () => {
      hasNextAssignedPage = true;
      activeRunsVisible = true;
    },
    rejectNextAssignedPage: () => {
      rejectAssignedCursor = true;
    },
    assignedCursors: () => cursors.slice(),
    setRunReadMode: (nextMode) => {
      mode = nextMode;
    },
    setExecutionMode: (nextMode) => {
      executionMode = nextMode;
    },
    setActiveRunsVisible: (visible) => {
      activeRunsVisible = visible;
    },
    holdNextRunRead: () => {
      if (releaseRead !== undefined) {
        throw new Error('A synthetic run read is already held.');
      }
      heldRead = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
    },
    releaseHeldRunRead: (nextMode) => {
      if (releaseRead === undefined) {
        throw new Error('No synthetic run read is held.');
      }
      mode = nextMode;
      releaseRead();
      releaseRead = undefined;
    },
  };
}
