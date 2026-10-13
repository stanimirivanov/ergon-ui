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

const query = { tenantId: TENANT_ID, runId: RUN_ID };

describe('assigned execution projection', () => {
  it('preserves missing, absent receipt, historical timing and measured zero as distinct values', () => {
    for (const snapshot of [
      validConsole(),
      { ...validConsole(), execution: null },
      { ...validConsole(), execution: { ...validExecution(), timing: null } },
      {
        ...validConsole(),
        execution: {
          ...validExecution(),
          timing: { ...validExecution().timing, elapsedNanoseconds: '0' },
        },
      },
    ]) {
      expect(decodeAssignedRunConsole(snapshot, query)).toEqual(snapshot);
    }
    expect(decodeAssignedRunConsole(validConsole(), query)).not.toHaveProperty(
      'execution',
    );
  });

  it.each(['0', '1', '9007199254740993', '9223372036854775807'])(
    'keeps exact nanoseconds %s and permits wall-clock correction before state projection',
    (elapsedNanoseconds) => {
      const snapshot = {
        ...validConsole(),
        execution: {
          ...validExecution(),
          timing: {
            ...validExecution().timing,
            elapsedNanoseconds,
            startedAt: '2026-10-01T10:00:00Z',
          },
        },
      };
      expect(decodeAssignedRunConsole(snapshot, query)).toEqual(snapshot);
      expect(snapshot.stateVersion).toBe(0);
    },
  );

  it.each([
    ...[
      '-1',
      '00',
      '01',
      '+1',
      ' 1',
      '1.0',
      '1e6',
      '',
      '9223372036854775808',
      '999999999999999999999999',
    ].map((elapsedNanoseconds) => ({
      ...validExecution(),
      timing: { ...validExecution().timing, elapsedNanoseconds },
    })),
    {
      ...validExecution(),
      timing: { ...validExecution().timing, elapsedNanoseconds: 42 },
    },
    {
      ...validExecution(),
      timing: { ...validExecution().timing, source: 'provider-guessed' },
    },
    {
      ...validExecution(),
      timing: { ...validExecution().timing, startedAt: '2026-02-30T10:00:00Z' },
    },
    {
      ...validExecution(),
      timing: {
        source: 'ergon.dev/measurement/connector-call/v1',
        elapsedNanoseconds: '1',
      },
    },
    { ...validExecution(), timing: undefined },
    { ...validExecution(), stepId: 'other-step' },
    { ...validExecution(), capability: 'other.capability' },
    { ...validExecution(), connector: ' ' },
    { ...validExecution(), completedAt: 'not-a-time' },
    { ...validExecution(), recordedAt: '2026-02-30T10:00:00Z' },
    { ...validExecution(), outcome: 'PENDING' },
  ])(
    'fails closed without retrying malformed or misattributed receipt %j',
    async (execution) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () =>
          jsonResponse({ ...validConsole(), execution }),
        );
      await expect(
        createRunSupervisionClient({ fetch }).getConsole(
          query,
          new AbortController().signal,
        ),
      ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('strips undisclosed receipt and timing fields, retaining a failed terminal result', () => {
    const execution = { ...validExecution(), outcome: 'FAILED' as const };
    const snapshot = { ...validConsole(), execution };
    expect(
      decodeAssignedRunConsole(
        {
          ...snapshot,
          execution: {
            ...execution,
            providerOperationReference: 'private-reference',
            grantId: 'private-grant',
            timing: { ...execution.timing, rawPayload: 'private-payload' },
          },
        },
        query,
      ),
    ).toEqual(snapshot);
  });
});
