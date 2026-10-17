import { describe, expect, it } from 'vitest';
import {
  decodeRetryReceipt,
  decodeRetryReview,
  decodeRetryCommand,
} from '../src/bff/run-retry-schemas';
import { retryCommand, retryReceipt, retryReview } from './run-retry-fixtures';

describe('retry review and acknowledgement attribution', () => {
  it('accepts eligible, disabled and exhausted observations without private extras', () => {
    expect(
      decodeRetryReview({
        ...retryReview,
        authorityEvidenceId: 'PRIVATE',
        plan: { ...retryCommand.plan, rawEvidence: 'PRIVATE' },
      }),
    ).toEqual(retryReview);
    const disabled = {
      ...retryReview,
      supported: false,
      canRetry: false,
      reason: 'DISABLED',
    };
    expect(decodeRetryReview(disabled)).toEqual(disabled);
    const exhausted = {
      ...retryReview,
      attemptNumber: 2,
      canRetry: false,
      reason: 'ATTEMPT_LIMIT_REACHED',
      plan: null,
    };
    expect(decodeRetryReview(exhausted)).toEqual(exhausted);
  });
  it.each([
    { supported: false },
    { canRetry: false },
    { reason: 'DISABLED' },
    { plan: null },
    { runVersion: 0 },
    { attemptNumber: 2 },
    { maximumAttempts: 0 },
    { attemptNumber: 1.5 },
    { runVersion: Number.MAX_SAFE_INTEGER },
    { supervisionRevision: -1 },
    { observedAt: 'yesterday' },
    { retryPolicyRevision: ' ' },
    { reason: 'UNKNOWN' },
    { plan: { ...retryCommand.plan, caseStreamVersion: 0 } },
    { plan: { ...retryCommand.plan, effectiveRisk: 'CRITICAL' } },
    { plan: { ...retryCommand.plan, requiredApproval: 'NONE' } },
    { canRetry: false, reason: 'PLAN_DENIED', plan: null, runVersion: 0 },
    { canRetry: false, reason: 'ATTEMPT_LIMIT_REACHED', plan: null },
  ])('rejects inconsistent eligibility or unsafe coordinates %#', (changes) => {
    expect(decodeRetryReview({ ...retryReview, ...changes })).toBeUndefined();
  });
  it('accepts all bounded ineligibility reasons without inventing a plan', () => {
    for (const reason of [
      'RUN_NOT_FAILED',
      'PLAN_NOT_READY',
      'PLAN_DENIED',
      'OPERATION_CHANGED',
    ]) {
      expect(
        decodeRetryReview({
          ...retryReview,
          canRetry: false,
          reason,
          plan: null,
        }),
      ).toBeDefined();
    }
  });
  it('binds original receipt coordinates and strips internal audit fields', () => {
    expect(
      decodeRetryReceipt(
        { ...retryReceipt, actorId: 'PRIVATE', assignmentId: 'PRIVATE' },
        retryCommand,
      ),
    ).toEqual(retryReceipt);
    expect(decodeRetryCommand(retryCommand)).toEqual(retryCommand);
    expect(
      decodeRetryCommand({ ...retryCommand, expectedAttemptNumber: 2 }),
    ).toBeUndefined();
    expect(
      decodeRetryCommand({
        ...retryCommand,
        plan: { ...retryCommand.plan, contractRevision: 0 },
      }),
    ).toBeUndefined();
  });
  it.each([
    { commandId: retryReceipt.successorRunId },
    { runId: retryReceipt.successorRunId },
    { successorRunId: retryCommand.runId },
    { successorRunId: 'invalid' },
    { supervisionRevision: 4 },
    { expectedRunVersion: 0 },
    { caseStreamVersion: 4 },
    { retryPolicyRevision: 'changed' },
    { sourceAttemptNumber: 2 },
    { maximumAttempts: 3 },
    { recordedAt: null },
    { startedAt: 'yesterday' },
  ])('rejects foreign or mismatched acknowledgement %#', (changes) => {
    expect(
      decodeRetryReceipt({ ...retryReceipt, ...changes }, retryCommand),
    ).toBeUndefined();
  });
});
