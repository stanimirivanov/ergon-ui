import { Either, Schema } from 'effect';
import {
  coherentBudget,
  type EvaluationPage,
  type EvaluationReport,
} from '@ergon/evaluation-model';
const text = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500));
const digest = Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/u));
const token = Schema.String.pipe(
  Schema.pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u),
);
const artifact = Schema.Struct({ key: token, revision: token, sha256: digest });
const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u),
  Schema.filter(
    (s) =>
      Number.isFinite(Date.parse(s)) &&
      new Date(Date.parse(s)).toISOString().slice(0, 19) === s.slice(0, 19),
  ),
);
const summary = Schema.Struct({
  reportId: Schema.UUID,
  fixture: artifact,
  reportDigest: digest,
  passed: Schema.Boolean,
  recordedAt: instant,
});
const page = Schema.Struct({
  items: Schema.Array(summary),
  nextAfter: Schema.NullOr(Schema.UUID),
});
const integer = Schema.Number.pipe(
  Schema.filter((n) => Number.isSafeInteger(n) && n >= 0),
);
const dimension = Schema.Struct({
  limit: Schema.NullOr(integer),
  measured: Schema.NullOr(integer),
  status: Schema.Literal('PASS', 'FAIL', 'UNKNOWN', 'ERROR', 'NOT_CONFIGURED'),
  reason: Schema.NullOr(
    Schema.Literal(
      'MISSING_USAGE',
      'MISSING_PRICING',
      'MISSING_DURATION',
      'CURRENCY_MISMATCH',
      'OVERFLOW',
    ),
  ),
}).pipe(Schema.filter(coherentBudget));
const report = Schema.Struct({
  summary,
  evaluator: artifact,
  assertions: artifact,
  checks: Schema.Array(
    Schema.Struct({
      id: text,
      required: Schema.Boolean,
      status: Schema.Literal('PASS', 'FAIL', 'ERROR', 'UNSUPPORTED'),
      explanation: Schema.Literal(
        'MATCH',
        'MISMATCH',
        'MISSING_OBSERVATION',
        'OBSERVATION_ERROR',
        'UNSUPPORTED_OBSERVATION',
        'UNSUPPORTED_ASSERTION',
        'PROOF_NOT_ACCEPTED',
        'INVALID_PROOF_PROVENANCE',
      ),
    }),
  ),
  budgets: Schema.NullOr(
    Schema.Struct({
      currency: Schema.String.pipe(Schema.pattern(/^[A-Z]{3}$/u)),
      cost: dimension,
      simulatedLatency: dimension,
    }),
  ),
});
function orderKey(item: EvaluationPage['items'][number]): string {
  const at = item.recordedAt;
  return (
    at.slice(0, 19) +
    '.' +
    (at.includes('.') ? at.slice(20, -1) : '').padEnd(9, '0') +
    '\0' +
    item.reportId.toLowerCase()
  );
}
/** Strip extra fields; validate bounded newest-first history and cursor correspondence. */
export function parseEvaluationPage(
  value: unknown,
  after: string | null,
): EvaluationPage | undefined {
  const decoded = Schema.decodeUnknownEither(page)(value);
  if (Either.isLeft(decoded)) return undefined;
  const result = decoded.right;
  if (
    result.items.length > 20 ||
    (result.nextAfter !== null &&
      (result.items.length !== 20 ||
        result.nextAfter !== result.items.at(-1)?.reportId))
  )
    return undefined;
  const ids = new Set<string>();
  let previous: string | undefined;
  for (const item of result.items) {
    const key = orderKey(item),
      id = item.reportId.toLowerCase();
    if (
      id === after?.toLowerCase() ||
      ids.has(id) ||
      (previous !== undefined && key > previous)
    )
      return undefined;
    ids.add(id);
    previous = key;
  }
  return result;
}
/** Exact identity must match; displayed server digests are not independently verified here. */
export function parseEvaluationReport(
  value: unknown,
  reportId: string,
): EvaluationReport | undefined {
  const decoded = Schema.decodeUnknownEither(report)(value);
  if (Either.isLeft(decoded)) return undefined;
  const result = decoded.right;
  if (
    result.summary.reportId.toLowerCase() !== reportId.toLowerCase() ||
    result.checks.length > 100 ||
    new Set(result.checks.map((c) => c.id)).size !== result.checks.length
  )
    return undefined;
  if (
    result.summary.passed &&
    (result.checks.some((c) => c.required && c.status !== 'PASS') ||
      (result.budgets !== null &&
        [result.budgets.cost, result.budgets.simulatedLatency].some(
          (d) => d.limit !== null && d.status !== 'PASS',
        )))
  )
    return undefined;
  return result;
}
