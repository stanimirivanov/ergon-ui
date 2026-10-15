import { describe, expect, it } from 'vitest';
import { decodeAssignedRunConsole } from '../src/bff/run-supervision-schemas';
import { TENANT_ID, RUN_ID, validConsole } from './run-supervision-fixtures';

const query = { tenantId: TENANT_ID, runId: RUN_ID };
const run = validConsole();
const fact = {
  factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  streamVersion: 3,
  property: 'account.access.state',
  accountReference: 'synthetic-account',
  value: 'LOCKED',
  boundAt: '2026-10-15T08:00:02Z',
  recordedAt: '2026-10-15T08:00:03Z',
  source: {
    observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    streamVersion: 2,
    originType: 'CONNECTOR',
    provider: 'synthetic-identity',
    reference: 'synthetic-account',
    content: '<script>untrusted text</script>',
    // A clock correction must not invalidate stream attribution.
    observedAt: '2026-10-15T08:00:10Z',
    recordedAt: '2026-10-15T08:00:01Z',
  },
};
const evidence = {
  caseId: run.caseId,
  caseStreamVersion: run.caseEvidenceStreamVersion,
  truncated: false,
  facts: [fact],
};
const decode = (pinnedEvidence: unknown) =>
  decodeAssignedRunConsole({ ...run, pinnedEvidence }, query);
describe('pinned evidence attribution', () => {
  it('distinguishes unsupported, empty and attributed snapshots and strips private extras', () => {
    expect(
      decodeAssignedRunConsole(run, query)?.pinnedEvidence,
    ).toBeUndefined();
    expect(decode({ ...evidence, facts: [] })?.pinnedEvidence?.facts).toEqual(
      [],
    );
    expect(
      decode({
        ...evidence,
        privateActor: 'SECRET',
        facts: [
          {
            ...fact,
            authorityEvidence: 'SECRET',
            source: { ...fact.source, token: 'SECRET' },
          },
        ],
      })?.pinnedEvidence,
    ).toEqual(evidence);
  });
  it.each([
    null,
    { ...evidence, caseId: RUN_ID },
    { ...evidence, caseStreamVersion: evidence.caseStreamVersion + 1 },
    { ...evidence, truncated: true },
    { ...evidence, facts: [fact, fact] },
    {
      ...evidence,
      facts: [{ ...fact, streamVersion: evidence.caseStreamVersion + 1 }],
    },
    { ...evidence, facts: [{ ...fact, property: 'unregistered.property' }] },
    {
      ...evidence,
      facts: [{ ...fact, source: { ...fact.source, streamVersion: 3 } }],
    },
    {
      ...evidence,
      facts: [
        { ...fact, source: { ...fact.source, reference: 'other-subject' } },
      ],
    },
    {
      ...evidence,
      facts: [{ ...fact, source: { ...fact.source, originType: 'REQUESTER' } }],
    },
    {
      ...evidence,
      facts: [
        { ...fact, source: { ...fact.source, content: 'x'.repeat(8001) } },
      ],
    },
    {
      ...evidence,
      facts: [
        { ...fact, source: { ...fact.source, observedAt: 'invalid-time' } },
      ],
    },
  ])(
    'rejects invalid evidence without returning a partial Console',
    (invalid) => expect(decode(invalid)).toBeUndefined(),
  );
  it('requires strict binding order and unique source identity even across different facts', () => {
    const second = {
      ...fact,
      factId: RUN_ID,
      streamVersion: 5,
      source: { ...fact.source, streamVersion: 4 },
    };
    const snapshot = {
      ...run,
      caseEvidenceStreamVersion: 6,
      pinnedEvidence: {
        ...evidence,
        caseStreamVersion: 6,
        facts: [fact, second],
      },
    };
    expect(decodeAssignedRunConsole(snapshot, query)).toBeUndefined();
    const distinct = {
      ...second,
      source: { ...second.source, observationId: RUN_ID },
    };
    expect(
      decodeAssignedRunConsole(
        {
          ...snapshot,
          pinnedEvidence: {
            ...snapshot.pinnedEvidence,
            facts: [fact, distinct],
          },
        },
        query,
      ),
    ).toBeDefined();
    expect(
      decodeAssignedRunConsole(
        {
          ...snapshot,
          pinnedEvidence: {
            ...snapshot.pinnedEvidence,
            facts: [distinct, fact],
          },
        },
        query,
      ),
    ).toBeUndefined();
  });
  it('accepts an explicitly incomplete bounded prefix but rejects oversized responses', () => {
    const facts = Array.from({ length: 101 }, (_, index) => ({
      ...fact,
      factId: `aaaaaaaa-aaaa-4aaa-8aaa-${(index + 1).toString(16).padStart(12, '0')}`,
      streamVersion: index * 2 + 3,
      source: {
        ...fact.source,
        observationId: `bbbbbbbb-bbbb-4bbb-8bbb-${(index + 1).toString(16).padStart(12, '0')}`,
        streamVersion: index * 2 + 2,
      },
    }));
    const snapshot = {
      ...run,
      caseEvidenceStreamVersion: 203,
      pinnedEvidence: {
        ...evidence,
        caseStreamVersion: 203,
        truncated: true,
        facts: facts.slice(0, 100),
      },
    };
    expect(
      decodeAssignedRunConsole(snapshot, query)?.pinnedEvidence?.truncated,
    ).toBe(true);
    expect(
      decodeAssignedRunConsole(
        { ...snapshot, pinnedEvidence: { ...snapshot.pinnedEvidence, facts } },
        query,
      ),
    ).toBeUndefined();
  });
});
