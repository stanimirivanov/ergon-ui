import type { RunPinnedReadiness, RunPinnedReadinessQuery } from '../src';
import { CASE_ID, RUN_ID, TENANT_ID } from './run-supervision-fixtures';

export const readinessQuery: RunPinnedReadinessQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  caseId: CASE_ID,
  caseStreamVersion: 205,
  contractKey: 'access-restoration',
  contractRevision: 1,
};
export const readinessExample: RunPinnedReadiness = {
  runId: RUN_ID,
  caseId: CASE_ID,
  caseStreamVersion: 205,
  supervisionRevision: 3,
  observedAt: '2026-10-21T08:00:00.123456789Z',
  contractKey: 'access-restoration',
  contractRevision: 1,
  evaluator: 'ergon.dev/evaluation/pinned-readiness/v1',
  status: 'READY',
  missingEvidence: [],
  applicability: {
    fact: 'account.access.state',
    expectedValue: 'LOCKED',
    actualValue: 'LOCKED',
  },
  selectedEvidence: [
    {
      factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: 203,
      property: 'account.access.state',
      accountReference: 'synthetic-account',
      value: 'LOCKED',
      boundAt: '2026-10-21T08:02:00Z',
      recordedAt: '2026-10-21T08:01:00Z',
      source: {
        observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        streamVersion: 202,
        originType: 'CONNECTOR',
        provider: 'identity-stub',
        reference: 'synthetic-account',
        content: 'SELECTED <b>INERT</b>',
        observedAt: '2026-10-21T08:03:00Z',
        recordedAt: '2026-10-21T08:00:00Z',
      },
    },
  ],
};
