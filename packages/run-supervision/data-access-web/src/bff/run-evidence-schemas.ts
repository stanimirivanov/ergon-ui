import { Schema } from 'effect';
import type { AssignedRunConsole } from '../contracts';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const version = Schema.Number.pipe(
  Schema.filter((value) => Number.isSafeInteger(value) && value > 0),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const text = (maximum: number): Schema.Schema<string> =>
  Schema.String.pipe(
    Schema.filter(
      (value) => value.trim().length > 0 && value.length <= maximum,
    ),
  );

/** Shared history/selection wire attribution; cross-record boundary checks remain with each consuming projection. */
export const pinnedEvidenceFactSchema = Schema.Struct({
  factId: uuid,
  streamVersion: version,
  property: Schema.Literal('account.access.state'),
  accountReference: text(500),
  value: Schema.Literal('ACTIVE', 'LOCKED'),
  boundAt: instant,
  recordedAt: instant,
  source: Schema.Struct({
    observationId: uuid,
    streamVersion: version,
    originType: Schema.Literal('CONNECTOR'),
    provider: text(100).pipe(Schema.pattern(/^[a-z0-9][a-z0-9._-]*$/)),
    reference: text(500),
    content: text(8000),
    observedAt: instant,
    recordedAt: instant,
  }),
});

/** Shape and bounded text limits precede cross-record validation; unknown/private fields are discarded. */
export const pinnedRunEvidenceSchema = Schema.Struct({
  caseId: uuid,
  caseStreamVersion: version,
  truncated: Schema.Boolean,
  facts: Schema.Array(pinnedEvidenceFactSchema).pipe(
    Schema.filter((facts) => facts.length <= 100),
  ),
});

/** Attribution follows stream positions, not wall-clock ordering. Omission is unsupported; explicit null is invalid. */
export function isConsistentPinnedEvidence(run: AssignedRunConsole): boolean {
  const evidence = run.pinnedEvidence;
  if (evidence === undefined) return true;
  if (
    evidence.caseId.toLowerCase() !== run.caseId.toLowerCase() ||
    evidence.caseStreamVersion !== run.caseEvidenceStreamVersion
  )
    return false;
  if (evidence.truncated && evidence.facts.length !== 100) return false;
  const factIds = new Set<string>();
  const observationIds = new Set<string>();
  let previousVersion = 0;
  return evidence.facts.every((fact) => {
    const factId = fact.factId.toLowerCase();
    const sourceId = fact.source.observationId.toLowerCase();
    const valid =
      !factIds.has(factId) &&
      !observationIds.has(sourceId) &&
      fact.streamVersion > previousVersion &&
      fact.streamVersion <= evidence.caseStreamVersion &&
      fact.source.streamVersion < fact.streamVersion &&
      fact.source.reference === fact.accountReference;
    factIds.add(factId);
    observationIds.add(sourceId);
    previousVersion = fact.streamVersion;
    return valid;
  });
}
