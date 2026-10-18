import { describe, expect, it } from 'vitest';
import {
  decodeEscalationCommand,
  decodeEscalationReceipt,
  decodeEscalationReview,
  isValidEscalationReviewQuery,
} from '../src/bff/run-escalation-schemas';
import {
  escalationCommand as command,
  escalationQuery as query,
  escalationReceipt as receipt,
  escalationReview as review,
} from './run-escalation-fixtures';

describe('exact exhausted-run escalation protocol', () => {
  it('strips extras and accepts eligible, disabled, terminal and remaining-budget observations distinctly', () => {
    expect(
      decodeEscalationReview({ ...review, authorityEvidenceId: 'PRIVATE' }),
    ).toEqual(review);
    expect(
      decodeEscalationReview({
        ...review,
        supported: false,
        canEscalate: false,
        reason: 'DISABLED',
      }),
    ).toMatchObject({ reason: 'DISABLED' });
    expect(
      decodeEscalationReview({
        ...review,
        runVersion: 2,
        canEscalate: false,
        reason: 'RUN_NOT_FAILED',
      }),
    ).toMatchObject({ reason: 'RUN_NOT_FAILED' });
    expect(
      decodeEscalationReview({
        ...review,
        attemptNumber: 1,
        canEscalate: false,
        reason: 'RETRY_BUDGET_AVAILABLE',
      }),
    ).toMatchObject({ reason: 'RETRY_BUDGET_AVAILABLE' });
    const input = { ...command, actorId: 'PRIVATE' };
    expect(decodeEscalationCommand(input)).toEqual(command);
  });
  it.each([
    { supported: false },
    { reason: 'DISABLED' },
    { canEscalate: false },
    { attemptNumber: 1 },
    { runVersion: 0 },
    { maximumAttempts: 0 },
    { attemptNumber: 2.5 },
    { supervisionRevision: Number.MAX_SAFE_INTEGER },
    { retryPolicyRevision: ' ' },
    { retryPolicyRevision: 'x'.repeat(201) },
    { followUpQueueKey: 'arbitrary' },
    { reason: 'RETRY_BUDGET_AVAILABLE', canEscalate: false },
    { observedAt: 'not-an-instant' },
  ])('rejects inconsistent/unsafe review %j', (patch) =>
    expect(decodeEscalationReview({ ...review, ...patch })).toBeUndefined(),
  );
  it.each([
    { commandId: receipt.followUpWorkItemId },
    { runId: receipt.escalationEventId },
    { supervisionRevision: 4 },
    { expectedRunVersion: 2 },
    { sourceAttemptNumber: 1 },
    { maximumAttempts: 3 },
    { retryPolicyRevision: 'changed' },
    { reason: 'OTHER' },
    { creationStatus: 'CLAIMED' },
    { followUpQueueKey: 'other' },
    { escalationEventId: 'bad' },
    { followUpWorkItemId: 'bad' },
    { requestedAt: null },
  ])('rejects foreign or malformed acknowledgement %j', (patch) =>
    expect(
      decodeEscalationReceipt({ ...receipt, ...patch }, command),
    ).toBeUndefined(),
  );
  it('accepts exact historical creation and equivalent UUID casing without treating timestamps as live state', () => {
    expect(
      decodeEscalationReceipt({ ...receipt, actorId: 'PRIVATE' }, command),
    ).toEqual(receipt);
    expect(
      decodeEscalationReceipt(
        { ...receipt, commandId: receipt.commandId.toUpperCase() },
        command,
      ),
    ).toBeDefined();
    expect(
      decodeEscalationCommand({ ...command, maximumAttempts: 3 }),
    ).toBeUndefined();
    expect(
      isValidEscalationReviewQuery({ ...query, tenantId: '../foreign' }),
    ).toBe(false);
  });
});
