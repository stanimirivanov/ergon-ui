import { Either, Schema } from 'effect';
import type {
  PromotionInput,
  PromotionReview,
  PromotionCommand,
  PromotionReceipt,
  PromotionEvidence,
} from '@ergon/evaluation-model';
import { artifact, instant } from './evaluation-schema';
const digest = Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/u));
const token = Schema.String.pipe(
  Schema.pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u),
);
const rationale = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2000),
  Schema.filter((s) => s === s.trim()),
);
const evidence = Schema.Struct({
  fixture: artifact,
  reportId: Schema.UUID,
  reportDigest: digest,
});
const reports = Schema.Array(evidence).pipe(
  Schema.maxItems(100),
  Schema.filter(
    (rows) =>
      new Set(rows.map((r) => r.fixture.key + '\0' + r.fixture.revision))
        .size === rows.length,
  ),
);
const version = Schema.Number.pipe(
  Schema.filter((n) => Number.isSafeInteger(n) && n > 0),
);
const intent = Schema.Struct({
  expectedVersion: version,
  suite: artifact,
  contract: artifact,
  policy: artifact,
  reports,
  rationale,
});
const reason = Schema.Literal(
  'CONTRACT_MISMATCH',
  'POLICY_MISMATCH',
  'UNEXPECTED_REPORT',
  'MISSING_REPORT',
  'REPORT_IDENTITY_MISMATCH',
  'INCOMPATIBLE_EVALUATOR',
  'REPORT_FAILED',
  'REQUIRED_ASSERTION_NOT_PASSED',
  'REQUIRED_COST_NOT_PASSED',
  'REQUIRED_LATENCY_NOT_PASSED',
);
const reasons = Schema.Array(reason).pipe(Schema.maxItems(10));
const review = Schema.Struct({
  intent,
  eligibility: Schema.Struct({
    eligible: Schema.Boolean,
    reasons,
    scenarios: Schema.Array(Schema.Struct({ fixture: artifact, reasons })).pipe(
      Schema.maxItems(100),
    ),
  }),
});
export const inputSchema = Schema.Struct({
  tenantId: Schema.UUID,
  actorId: Schema.UUID,
  contractKey: token,
  reports,
  rationale,
});
export const commandSchema = Schema.Struct({
  tenantId: Schema.UUID,
  actorId: Schema.UUID,
  commandId: Schema.UUID,
  intent,
});
/** Parse user-supplied exact evidence coordinates. Unknown fields are stripped before transport. */
export function parsePromotionEvidence(
  text: string,
): readonly PromotionEvidence[] | undefined {
  try {
    if (text.length > 120000) return undefined;
    const value = Schema.decodeUnknownEither(reports)(JSON.parse(text));
    return Either.isRight(value) ? value.right : undefined;
  } catch {
    return undefined;
  }
}
const identity = (r: PromotionEvidence): string =>
  JSON.stringify([
    r.fixture.key,
    r.fixture.revision,
    r.fixture.sha256,
    r.reportId.toLowerCase(),
    r.reportDigest,
  ]);
/** Review must bind exactly the submitted evidence/rationale and contract key, with coherent eligibility. */
export function parsePromotionReview(
  value: unknown,
  input: PromotionInput,
): PromotionReview | undefined {
  const decoded = Schema.decodeUnknownEither(review)(value);
  if (Either.isLeft(decoded)) return undefined;
  const r = decoded.right;
  if (
    r.intent.contract.key !== input.contractKey ||
    r.intent.rationale !== input.rationale ||
    JSON.stringify(r.intent.reports.map(identity).sort()) !==
      JSON.stringify(input.reports.map(identity).sort())
  )
    return undefined;
  if (
    r.eligibility.eligible !==
    (r.eligibility.reasons.length === 0 &&
      r.eligibility.scenarios.every((s) => s.reasons.length === 0))
  )
    return undefined;
  if (
    new Set(
      r.eligibility.scenarios.map(
        (s) => s.fixture.key + '\0' + s.fixture.revision,
      ),
    ).size !== r.eligibility.scenarios.length
  )
    return undefined;
  if (r.eligibility.eligible) {
    const key = (a: {
      readonly key: string;
      readonly revision: string;
      readonly sha256: string;
    }): string => JSON.stringify([a.key, a.revision, a.sha256]);
    const selected = new Set(r.intent.reports.map((row) => key(row.fixture)));
    if (
      selected.size !== r.eligibility.scenarios.length ||
      r.eligibility.scenarios.some((row) => !selected.has(key(row.fixture)))
    )
      return undefined;
  }
  return r;
}
const receipt = Schema.Struct({
  commandId: Schema.UUID,
  created: Schema.Boolean,
  contract: artifact,
  suite: artifact,
  bindingVersion: version,
  promotedAt: instant,
});
/** An acknowledgement must match the complete reviewed contract/suite, binding version and command UUID. */
export function parsePromotionReceipt(
  value: unknown,
  command: PromotionCommand,
): PromotionReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receipt)(value);
  if (Either.isLeft(decoded)) return undefined;
  const r = decoded.right;
  return r.commandId === command.commandId &&
    r.bindingVersion === command.intent.expectedVersion &&
    JSON.stringify(r.contract) === JSON.stringify(command.intent.contract) &&
    JSON.stringify(r.suite) === JSON.stringify(command.intent.suite)
    ? r
    : undefined;
}
