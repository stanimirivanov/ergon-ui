import type {
  AssignedRunConsole,
  RunOutcomeVerification,
} from '@ergon/run-supervision-data-access-web';
import { assignedRunConsole } from './assigned-run-fixtures';

export const matchingVerification = {
  property: 'account.access.state',
  expectedValue: 'ACTIVE',
  status: 'MATCHING',
  reason: null,
  caseStreamVersion: 5,
  acceptance: null,
  evidence: {
    factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    streamVersion: 5,
    value: 'ACTIVE',
    accountReference: 'synthetic-account',
    boundAt: '2026-10-09T10:01:01Z',
    source: {
      observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      streamVersion: 4,
      originType: 'CONNECTOR',
      provider: 'synthetic-identity',
      reference: 'synthetic-account',
      content: '<img src=x onerror=alert(1)>PRIVATE_PROOF_SOURCE',
      observedAt: '2026-10-09T10:01:00Z',
    },
  },
} satisfies RunOutcomeVerification;

export const verifyingRun: AssignedRunConsole = {
  ...assignedRunConsole,
  state: 'VERIFYING',
  stateVersion: 1,
  stateUpdatedAt: '2026-10-09T10:00:00Z',
  outcomeVerification: matchingVerification,
  execution: {
    stepId: assignedRunConsole.stepId,
    capability: assignedRunConsole.capability,
    connector: 'synthetic-identity',
    outcome: 'SUCCEEDED',
    completedAt: '2026-10-09T10:00:00Z',
    recordedAt: '2026-10-09T10:00:01Z',
    timing: null,
  },
  transitions: [
    {
      sequence: 1,
      type: 'CAPABILITY_SUCCEEDED',
      fromState: 'WAITING_FOR_APPROVAL',
      toState: 'VERIFYING',
      occurredAt: '2026-10-09T10:00:00Z',
      recordedAt: '2026-10-09T10:00:01Z',
    },
  ],
};
