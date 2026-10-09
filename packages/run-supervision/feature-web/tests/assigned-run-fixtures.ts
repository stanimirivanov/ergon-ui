import type {
  AssignedRunConsole,
  AssignedRunPage,
} from '@ergon/run-supervision-data-access-web';

export const TENANT_ID = '11111111-1111-4111-8111-111111111111';
export const RUN_ID = '22222222-2222-4222-8222-222222222222';
export const SECOND_RUN_ID = '33333333-3333-4333-8333-333333333333';
export const CASE_ID = '44444444-4444-4444-8444-444444444444';
export const ASSIGNED_AT = '2026-10-09T10:00:00Z';

export const assignedRunConsole: AssignedRunConsole = {
  runId: RUN_ID,
  caseId: CASE_ID,
  caseEvidenceStreamVersion: 3,
  contractKey: 'access-restoration',
  contractRevision: 2,
  policyRevision: 'access-policy-7',
  stepId: 'restore-access',
  capability: 'workspace-access.update',
  effectiveRisk: 'MEDIUM',
  requiredApproval: 'RESOLVER',
  attemptNumber: 1,
  predecessorRunId: null,
  startedRecordedAt: '2026-10-09T09:55:00Z',
  state: 'WAITING_FOR_APPROVAL',
  stateVersion: 0,
  stateUpdatedAt: '2026-10-09T09:55:00Z',
  assignedAt: ASSIGNED_AT,
};

export function assignedPage(runId = RUN_ID): AssignedRunPage {
  return {
    entries: [
      {
        runId,
        caseId: CASE_ID,
        state: 'WAITING_FOR_APPROVAL',
        stateVersion: 0,
        stateUpdatedAt: '2026-10-09T09:55:00Z',
        assignedAt: ASSIGNED_AT,
      },
    ],
    nextCursor: null,
  };
}
