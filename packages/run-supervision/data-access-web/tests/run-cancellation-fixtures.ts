import type {
  RunCancellationCommand,
  RunCancellationReceipt,
  RunCancellationReview,
  RunCancellationReviewQuery,
} from '../src';
import { TENANT_ID, RUN_ID } from './run-supervision-fixtures';
export const cancellationQuery: RunCancellationReviewQuery = {
  tenantId: TENANT_ID,
  runId: RUN_ID,
  expectedSupervisionRevision: 3,
  expectedRunVersion: 0,
};
export const cancellationCommand: RunCancellationCommand = {
  ...cancellationQuery,
  commandId: '77777777-7777-4777-8777-777777777777',
};
export const cancellationReview: RunCancellationReview = {
  supported: true,
  observedAt: '2026-10-18T08:00:00Z',
  supervisionRevision: 3,
  runVersion: 0,
  canCancel: true,
  reason: 'ELIGIBLE',
};
export const cancellationReceipt: RunCancellationReceipt = {
  commandId: cancellationCommand.commandId,
  runId: RUN_ID,
  supervisionRevision: 3,
  expectedRunVersion: 0,
  reason: 'OPERATOR_REQUESTED',
  cancelledAt: '2026-10-18T08:01:00Z',
  recordedAt: '2026-10-18T08:01:00.123456Z',
};
