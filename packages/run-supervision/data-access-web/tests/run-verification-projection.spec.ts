import { describe, expect, it } from 'vitest';
import type { AssignedRunConsole, RunOutcomeVerification } from '../src';
import { decodeAssignedRunConsole } from '../src/bff/run-supervision-schemas';
import {
  TENANT_ID,
  RUN_ID,
  validConsole,
  validExecution,
} from './run-supervision-fixtures';

const action = validExecution();
const condition = {
  property: 'account.access.state',
  expectedValue: 'ACTIVE',
} as const;
const evidence = {
  factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  streamVersion: 7,
  value: 'ACTIVE',
  accountReference: 'synthetic-account',
  boundAt: '2026-10-01T09:11:00Z',
  source: {
    observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    streamVersion: 6,
    originType: 'CONNECTOR',
    provider: 'synthetic-identity',
    reference: 'synthetic-account',
    content: '<img src=x> UNTRUSTED',
    observedAt: action.completedAt,
  },
} as const;
const matching: RunOutcomeVerification = {
  ...condition,
  status: 'MATCHING',
  reason: null,
  caseStreamVersion: 7,
  evidence,
  acceptance: null,
};
const verifying: AssignedRunConsole = {
  ...validConsole(),
  state: 'VERIFYING',
  stateVersion: 1,
  stateUpdatedAt: action.completedAt,
  execution: action,
  transitions: [
    {
      sequence: 1,
      type: 'CAPABILITY_SUCCEEDED',
      fromState: 'WAITING_FOR_APPROVAL',
      toState: 'VERIFYING',
      occurredAt: action.completedAt,
      recordedAt: action.recordedAt,
    },
  ],
};
const accepted: RunOutcomeVerification = {
  ...condition,
  status: 'ACCEPTED',
  reason: null,
  caseStreamVersion: 7,
  evidence,
  acceptance: {
    runSequence: 2,
    acceptedAt: '2026-10-01T09:12:00Z',
    recordedAt: '2026-10-01T09:12:01Z',
    caseClosureStreamVersion: 8,
  },
};
const terminal: AssignedRunConsole = {
  ...verifying,
  state: 'VERIFIED_RESOLVED',
  stateVersion: 2,
  stateUpdatedAt: '2026-10-01T09:12:00Z',
  transitions: [
    ...(verifying.transitions ?? []),
    {
      sequence: 2,
      type: 'OUTCOME_PROOF_ACCEPTED',
      fromState: 'VERIFYING',
      toState: 'VERIFIED_RESOLVED',
      occurredAt: '2026-10-01T09:12:00Z',
      recordedAt: '2026-10-01T09:12:01Z',
    },
  ],
};
const decode = (
  proof: unknown,
  run: AssignedRunConsole = verifying,
): AssignedRunConsole | undefined =>
  decodeAssignedRunConsole(
    { ...run, outcomeVerification: proof },
    { tenantId: TENANT_ID, runId: RUN_ID },
  );

describe('outcome verification disclosure', () => {
  it('does not mistake relational timestamp precision for a mismatched paired acceptance', () => {
    const proof = {
      ...accepted,
      evidence: { ...evidence, boundAt: '2026-10-01T09:12:00.000000400Z' },
    };
    expect(decode(proof, terminal)?.outcomeVerification).toEqual(proof);
  });
  it('preserves opaque expected values without normalizing them to an account-state enum', () => {
    const proof = {
      ...matching,
      status: 'PENDING',
      reason: 'VALUE_MISMATCH',
      expectedValue: ' ACTIVE ',
    };
    expect(decode(proof)?.outcomeVerification?.expectedValue).toBe(' ACTIVE ');
    expect(decode({ ...proof, expectedValue: '  ' })).toBeUndefined();
    expect(
      decode({ ...proof, expectedValue: 'x'.repeat(201) }),
    ).toBeUndefined();
    expect(
      decode({ ...proof, status: 'MATCHING', reason: null }),
    ).toBeUndefined();
  });
  it('keeps omission, not assessed, missing, mismatch, mutable match and durable acceptance distinct', () => {
    expect(
      decodeAssignedRunConsole(validConsole(), {
        tenantId: TENANT_ID,
        runId: RUN_ID,
      })?.outcomeVerification,
    ).toBeUndefined();
    const unassessed = {
      ...condition,
      status: 'NOT_ASSESSED',
      reason: 'RUN_NOT_VERIFYING',
      caseStreamVersion: null,
      evidence: null,
      acceptance: null,
    };
    expect(decode(unassessed, validConsole())?.outcomeVerification).toEqual(
      unassessed,
    );
    for (const proof of [
      matching,
      {
        ...matching,
        status: 'PENDING',
        reason: 'ELIGIBLE_EVIDENCE_MISSING',
        evidence: null,
      },
      {
        ...matching,
        status: 'PENDING',
        reason: 'VALUE_MISMATCH',
        evidence: { ...evidence, value: 'LOCKED' },
      },
    ])
      expect(decode(proof)?.outcomeVerification).toEqual(proof);
    expect(decode(accepted, terminal)?.outcomeVerification).toEqual(accepted);
  });
  it.each([
    null,
    { ...matching, status: 'ACCEPTED' },
    { ...matching, reason: 'VALUE_MISMATCH' },
    { ...matching, caseStreamVersion: 6 },
    { ...matching, evidence: null },
    { ...matching, evidence: { ...evidence, value: 'LOCKED' } },
    {
      ...matching,
      evidence: {
        ...evidence,
        source: { ...evidence.source, streamVersion: 5 },
      },
    },
    {
      ...matching,
      evidence: {
        ...evidence,
        source: { ...evidence.source, streamVersion: 7 },
      },
    },
    {
      ...matching,
      evidence: {
        ...evidence,
        source: { ...evidence.source, reference: 'other' },
      },
    },
    {
      ...matching,
      evidence: {
        ...evidence,
        source: { ...evidence.source, content: 'x'.repeat(8001) },
      },
    },
    {
      ...matching,
      evidence: {
        ...evidence,
        source: {
          ...evidence.source,
          observedAt: '2026-10-01T09:10:01.000000999Z',
        },
      },
    },
    { ...matching, evidence: { ...evidence, boundAt: '2026-10-01T09:10:00Z' } },
  ])(
    'rejects malformed, pre-pin, pre-action or inconsistent proof without partial disclosure',
    (proof) => expect(decode(proof)).toBeUndefined(),
  );
  it('requires aligned state, successful execution, immutable acceptance and exact closure', () => {
    expect(decode(matching, validConsole())).toBeUndefined();
    expect(decode(matching, { ...verifying, execution: null })).toBeUndefined();
    expect(decode(matching, terminal)).toBeUndefined();
    expect(decode(accepted)).toBeUndefined();
    for (const acceptance of [
      { ...accepted.acceptance, caseClosureStreamVersion: 7 },
      { ...accepted.acceptance, runSequence: 1 },
      { ...accepted.acceptance, acceptedAt: '2026-10-01T09:12:00.000000001Z' },
    ])
      expect(decode({ ...accepted, acceptance }, terminal)).toBeUndefined();
  });
  it('strips private extras and preserves sub-millisecond eligibility and equivalent fractional padding', () => {
    expect(
      decode({
        ...matching,
        privateDecisionId: 'SECRET',
        evidence: {
          ...evidence,
          rawPayload: 'SECRET',
          source: {
            ...evidence.source,
            token: 'SECRET',
            observedAt: '2026-10-01T09:10:01.000001000Z',
          },
        },
      })?.outcomeVerification,
    ).toEqual({
      ...matching,
      evidence: {
        ...evidence,
        source: {
          ...evidence.source,
          observedAt: '2026-10-01T09:10:01.000001000Z',
        },
      },
    });
  });
});
