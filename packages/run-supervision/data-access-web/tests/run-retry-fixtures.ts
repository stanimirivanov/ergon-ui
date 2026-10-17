import type {
  RunRetryCommand,
  RunRetryReceipt,
  RunRetryReview,
  RunRetryReviewQuery,
} from '../src';
import { TENANT_ID, RUN_ID, OTHER_RUN_ID } from './run-supervision-fixtures';

export const retryQuery: RunRetryReviewQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  expectedRunVersion: 1,
};
export const retryCommand: RunRetryCommand = {
  ...retryQuery,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedAttemptNumber: 1,
  retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
  maximumAttempts: 2,
  plan: {
    caseStreamVersion: 5,
    contractKey: 'access-restoration',
    contractRevision: 2,
    policyRevision: 'ergon.dev/policy/access/v2',
    stepId: 'restore-access',
    capability: 'identity.account.unlock',
    effectiveRisk: 'HIGH',
    requiredApproval: 'RESOLVER',
  },
};
export const retryReview: RunRetryReview = {
  supported: true,
  observedAt: '2026-10-17T08:00:00Z',
  supervisionRevision: 3,
  runVersion: 1,
  attemptNumber: 1,
  retryPolicyRevision: retryCommand.retryPolicyRevision,
  maximumAttempts: 2,
  canRetry: true,
  reason: null,
  plan: retryCommand.plan,
};
export const retryReceipt: RunRetryReceipt = {
  commandId: retryCommand.commandId,
  runId: RUN_ID,
  successorRunId: OTHER_RUN_ID,
  supervisionRevision: 3,
  expectedRunVersion: 1,
  caseStreamVersion: 5,
  retryPolicyRevision: retryCommand.retryPolicyRevision,
  sourceAttemptNumber: 1,
  maximumAttempts: 2,
  startedAt: '2026-10-17T08:01:00Z',
  recordedAt: '2026-10-17T08:01:00.123456Z',
};
