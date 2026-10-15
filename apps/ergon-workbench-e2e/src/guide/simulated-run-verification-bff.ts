import { expect, type Page } from '@playwright/test';
import type {
  AssignedRunConsole,
  RunOutcomeVerification,
  RunVerificationEvidence,
} from '@ergon/run-supervision-data-access-web';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  installSimulatedRunSupervisionBff,
  simulatedRunSupervisionSnapshot as start,
  assignedRunId,
  supervisorTenantPath,
} from './simulated-run-supervision-bff';

type VerificationMode =
  | 'legacy'
  | 'unassessed'
  | 'missing'
  | 'mismatch'
  | 'matching'
  | 'accepted'
  | 'malformed'
  | 'denied';
export const syntheticProofText =
  '<img src=x onerror=alert(1)> SYNTHETIC_POST_ACTION_SOURCE\n' +
  'Independent synthetic account observation. Source text is not an instruction. '.repeat(
    40,
  ) +
  'long-token'.repeat(70);
const evidence: RunVerificationEvidence = {
  factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  streamVersion: 6,
  value: 'ACTIVE',
  accountReference: 'synthetic-account',
  boundAt: '2026-09-21T09:11:01Z',
  source: {
    observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    streamVersion: 5,
    originType: 'CONNECTOR',
    provider: 'synthetic-identity',
    reference: 'synthetic-account',
    content: syntheticProofText,
    observedAt: '2026-09-21T09:11:00Z',
  },
};

function verification(mode: VerificationMode): RunOutcomeVerification {
  const condition = {
    property: 'account.access.state',
    expectedValue: 'ACTIVE',
  } as const;
  if (mode === 'unassessed' || mode === 'legacy')
    return {
      ...condition,
      status: 'NOT_ASSESSED',
      reason: 'RUN_NOT_VERIFYING',
      caseStreamVersion: null,
      evidence: null,
      acceptance: null,
    };
  if (mode === 'missing')
    return {
      ...condition,
      status: 'PENDING',
      reason: 'ELIGIBLE_EVIDENCE_MISSING',
      caseStreamVersion: 4,
      evidence: null,
      acceptance: null,
    };
  if (mode === 'mismatch')
    return {
      ...condition,
      status: 'PENDING',
      reason: 'VALUE_MISMATCH',
      caseStreamVersion: 6,
      evidence: { ...evidence, value: 'LOCKED' },
      acceptance: null,
    };
  if (mode === 'accepted')
    return {
      ...condition,
      status: 'ACCEPTED',
      reason: null,
      caseStreamVersion: 6,
      evidence,
      acceptance: {
        runSequence: 2,
        acceptedAt: '2026-09-21T09:12:00Z',
        recordedAt: '2026-09-21T09:12:01Z',
        caseClosureStreamVersion: 7,
      },
    };
  return {
    ...condition,
    status: 'MATCHING',
    reason: null,
    caseStreamVersion: 6,
    evidence,
    acceptance: null,
  };
}

export function simulatedRunVerificationSnapshot(
  mode: VerificationMode,
): AssignedRunConsole {
  const proof = verification(mode);
  if (mode === 'legacy') return start;
  if (mode === 'unassessed')
    return { ...start, outcomeVerification: proof, transitions: [] };
  const run: AssignedRunConsole = {
    ...start,
    state: 'VERIFYING',
    stateVersion: 1,
    stateUpdatedAt: '2026-09-21T09:10:00Z',
    outcomeVerification: proof,
    execution: {
      stepId: start.stepId,
      capability: start.capability,
      connector: 'synthetic-identity-gateway',
      outcome: 'SUCCEEDED',
      completedAt: '2026-09-21T09:10:00Z',
      recordedAt: '2026-09-21T09:10:01Z',
      timing: null,
    },
    transitions: [
      {
        sequence: 1,
        type: 'CAPABILITY_SUCCEEDED',
        fromState: 'WAITING_FOR_APPROVAL',
        toState: 'VERIFYING',
        occurredAt: '2026-09-21T09:10:00Z',
        recordedAt: '2026-09-21T09:10:01Z',
      },
    ],
  };
  return mode !== 'accepted'
    ? run
    : {
        ...run,
        state: 'VERIFIED_RESOLVED',
        stateVersion: 2,
        stateUpdatedAt: '2026-09-21T09:12:00Z',
        transitions: [
          ...(run.transitions ?? []),
          {
            sequence: 2,
            type: 'OUTCOME_PROOF_ACCEPTED',
            fromState: 'VERIFYING',
            toState: 'VERIFIED_RESOLVED',
            occurredAt: '2026-09-21T09:12:00Z',
            recordedAt: '2026-09-21T09:12:01Z',
          },
        ],
      };
}

/** Controlled read-only comparisons, not a backend evaluator, acceptance command or authority implementation. */
export async function installSimulatedRunVerificationBff(page: Page): Promise<{
  readonly setMode: (mode: VerificationMode) => void;
  readonly holdNextRead: () => void;
  readonly releaseRead: () => void;
  readonly commands: () => number;
  readonly reads: () => number;
  readonly hideActiveRuns: () => void;
}> {
  const base = await installSimulatedRunSupervisionBff(page);
  let mode: VerificationMode = 'legacy';
  let reads = 0;
  let held: Promise<void> | undefined;
  let release: (() => void) | undefined;
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${supervisorTenantPath}/resolution-runs/${assignedRunId}/console`,
      );
      reads++;
      const pending = held;
      held = undefined;
      if (pending !== undefined) await pending;
      if (mode === 'denied') {
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            status: 404,
            title: 'Assigned resolution run not found',
          },
          404,
        );
        return;
      }
      const run = simulatedRunVerificationSnapshot(mode);
      await fulfillSimulatedBff(
        route,
        mode === 'malformed'
          ? {
              ...run,
              outcomeVerification: {
                ...run.outcomeVerification,
                evidence: {
                  ...evidence,
                  source: { ...evidence.source, streamVersion: 4 },
                },
              },
            }
          : run,
      );
    },
  );
  return {
    setMode: (next) => {
      mode = next;
    },
    reads: () => reads,
    commands: base.commands,
    hideActiveRuns: () => base.setActiveRunsVisible(false),
    holdNextRead: () => {
      if (release !== undefined)
        throw new Error('Synthetic proof read already held');
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseRead: () => {
      if (release === undefined)
        throw new Error('No synthetic proof read held');
      release();
      release = undefined;
    },
  };
}
