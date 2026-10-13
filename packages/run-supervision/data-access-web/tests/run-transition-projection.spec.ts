import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient } from '../src';
import { decodeAssignedRunConsole } from '../src/bff/run-supervision-schemas';
import {
  RUN_ID,
  TENANT_ID,
  validConsole,
  validExecution,
  jsonResponse,
} from './run-supervision-fixtures';

const first = {
  sequence: 1,
  type: 'CAPABILITY_SUCCEEDED',
  fromState: 'WAITING_FOR_APPROVAL',
  toState: 'VERIFYING',
  occurredAt: validExecution().completedAt,
  recordedAt: '2026-10-01T09:10:02Z',
};
const last = {
  sequence: 2,
  type: 'OUTCOME_PROOF_ACCEPTED',
  fromState: 'VERIFYING',
  toState: 'VERIFIED_RESOLVED',
  occurredAt: '2026-10-01T09:00:00.123456789Z',
  recordedAt: '2026-10-01T09:00:00Z',
};
const query = { tenantId: TENANT_ID, runId: RUN_ID };
const snapshot = {
  ...validConsole(),
  execution: validExecution(),
  state: 'VERIFIED_RESOLVED',
  stateVersion: 2,
  stateUpdatedAt: last.occurredAt,
  transitions: [first, last],
};

describe('recorded run history decoding', () => {
  it('distinguishes unsupported history from an empty version-zero prefix with a receipt', () => {
    expect(decodeAssignedRunConsole(validConsole(), query)).not.toHaveProperty(
      'transitions',
    );
    const unprojected = {
      ...validConsole(),
      execution: validExecution(),
      transitions: [],
    };
    expect(decodeAssignedRunConsole(unprojected, query)).toEqual(unprojected);
  });
  it('keeps sequence order despite corrected clock observations and strips private event attribution', () => {
    expect(
      decodeAssignedRunConsole(
        {
          ...snapshot,
          transitions: [
            { ...first, eventId: 'private-event', actorId: 'private-actor' },
            last,
          ],
        },
        query,
      ),
    ).toEqual(snapshot);
  });
  it.each([
    { ...snapshot, transitions: null },
    { ...snapshot, transitions: [] },
    { ...snapshot, transitions: [first] },
    { ...snapshot, transitions: [last, first] },
    { ...snapshot, transitions: [first, last, last] },
    { ...snapshot, transitions: [first, { ...last, sequence: 3 }] },
    { ...snapshot, transitions: [first, { ...last, type: 'UNKNOWN' }] },
    {
      ...snapshot,
      transitions: [first, { ...last, fromState: 'ACTION_FAILED' }],
    },
    { ...snapshot, transitions: [first, { ...last, toState: 'ESCALATED' }] },
    {
      ...snapshot,
      transitions: [first, { ...last, occurredAt: '2026-02-30T10:00:00Z' }],
    },
    { ...snapshot, state: 'SUPERSEDED' },
    { ...snapshot, stateUpdatedAt: '2026-10-01T09:00:00.123456788Z' },
    { ...snapshot, execution: null },
    { ...snapshot, execution: { ...validExecution(), outcome: 'FAILED' } },
    {
      ...snapshot,
      execution: {
        ...validExecution(),
        completedAt: '2026-10-01T09:10:01.000002Z',
      },
    },
  ])(
    'rejects mixed malformed or incomplete prefixes without retry %j',
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () => jsonResponse(body));
      await expect(
        createRunSupervisionClient({ fetch }).getConsole(
          query,
          new AbortController().signal,
        ),
      ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it('recognizes equivalent fractional padding without discarding nanosecond differences', () => {
    expect(
      decodeAssignedRunConsole(
        {
          ...snapshot,
          transitions: [
            { ...first, occurredAt: '2026-10-01T09:10:01.000001000Z' },
            last,
          ],
        },
        query,
      ),
    ).toBeDefined();
  });
  it('chains a no-human-approval start from authorization readiness, not waiting', () => {
    const body = {
      ...snapshot,
      requiredApproval: 'NONE',
      effectiveRisk: 'LOW',
      transitions: [{ ...first, fromState: 'READY_FOR_AUTHORIZATION' }, last],
    };
    expect(decodeAssignedRunConsole(body, query)).toEqual(body);
    expect(
      decodeAssignedRunConsole({ ...body, transitions: [first, last] }, query),
    ).toBeUndefined();
  });
  it.each(['RETRY_STARTED', 'ESCALATION_REQUESTED'])(
    'accepts failed recovery transition %s',
    (type) => {
      const toState = type === 'RETRY_STARTED' ? 'SUPERSEDED' : 'ESCALATED';
      const body = {
        ...snapshot,
        state: toState,
        execution: { ...validExecution(), outcome: 'FAILED' },
        transitions: [
          { ...first, type: 'CAPABILITY_FAILED', toState: 'ACTION_FAILED' },
          { ...last, type, fromState: 'ACTION_FAILED', toState },
        ],
      };
      expect(decodeAssignedRunConsole(body, query)).toEqual(body);
    },
  );
});
