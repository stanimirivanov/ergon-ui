import type {
  RunEscalationCommand,
  RunEscalationReceipt,
  RunEscalationReview,
  RunEscalationReviewQuery,
} from '../src';
import { TENANT_ID, RUN_ID, OTHER_RUN_ID } from './run-supervision-fixtures';

export const escalationQuery: RunEscalationReviewQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  expectedRunVersion: 1,
};
export const escalationCommand: RunEscalationCommand = {
  ...escalationQuery,
  commandId: '77777777-7777-4777-8777-777777777777',
  sourceAttemptNumber: 2,
  retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
  maximumAttempts: 2,
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
};
export const escalationReview: RunEscalationReview = {
  supported: true,
  observedAt: '2026-10-18T08:00:00Z',
  supervisionRevision: 3,
  runVersion: 1,
  attemptNumber: 2,
  retryPolicyRevision: escalationCommand.retryPolicyRevision,
  maximumAttempts: 2,
  canEscalate: true,
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
  followUpQueueKey: 'access-restoration',
};
export const escalationReceipt: RunEscalationReceipt = {
  commandId: escalationCommand.commandId,
  runId: RUN_ID,
  supervisionRevision: 3,
  expectedRunVersion: 1,
  sourceAttemptNumber: 2,
  retryPolicyRevision: escalationCommand.retryPolicyRevision,
  maximumAttempts: 2,
  reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
  escalationEventId: OTHER_RUN_ID,
  followUpWorkItemId: '88888888-8888-4888-8888-888888888888',
  followUpQueueKey: 'access-restoration',
  creationStatus: 'OPEN',
  requestedAt: '2026-10-18T08:01:00Z',
  recordedAt: '2026-10-18T08:01:00.123456Z',
};
