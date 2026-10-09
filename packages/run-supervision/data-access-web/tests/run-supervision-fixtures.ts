import type { AssignedRunConsole, AssignedRunPage } from '../src';

export const TENANT_ID = '11111111-1111-4111-8111-111111111111';
export const RUN_ID = '22222222-2222-4222-8222-222222222222';
export const CASE_ID = '33333333-3333-4333-8333-333333333333';
export const OTHER_RUN_ID = '44444444-4444-4444-8444-444444444444';
export const ASSIGNMENT_ID = '55555555-5555-4555-8555-555555555555';

export function validConsole(): AssignedRunConsole {
  return {
    runId: RUN_ID,
    caseId: CASE_ID,
    caseEvidenceStreamVersion: 5,
    contractKey: 'access-restoration',
    contractRevision: 1,
    policyRevision: 'policy-1',
    stepId: 'restore-access',
    capability: 'access.restore',
    effectiveRisk: 'HIGH',
    requiredApproval: 'RESOLVER',
    attemptNumber: 1,
    predecessorRunId: null,
    startedRecordedAt: '2026-10-01T09:00:00.123456789Z',
    state: 'WAITING_FOR_APPROVAL',
    stateVersion: 0,
    stateUpdatedAt: '2026-10-01T09:00:00.123456789Z',
    assignedAt: '2026-10-01T09:05:00Z',
  };
}

export function validPage(): AssignedRunPage {
  return {
    entries: [
      {
        runId: RUN_ID,
        caseId: CASE_ID,
        state: 'WAITING_FOR_APPROVAL',
        stateVersion: 0,
        stateUpdatedAt: '2026-10-01T09:00:00Z',
        assignedAt: '2026-10-01T09:05:00Z',
      },
    ],
    nextCursor: null,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
