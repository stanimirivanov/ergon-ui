import type { ReactElement } from 'react';
import { Button } from '@ergon/ui-web';
import {
  evaluationApi,
  normalizeEvaluationFailure,
  type EvaluationFailure,
} from '@ergon/evaluation-data-access-web';
import type {
  EvaluationQuery,
  EvaluationArtifact,
  EvaluationBudgetDimension,
  EvaluationReport,
} from '@ergon/evaluation-model';
const failures: Readonly<Record<EvaluationFailure['kind'], string>> = {
  'authentication-required':
    'Your session must be renewed. No retained reports are shown.',
  denied:
    'Evaluation access or the selected report is unavailable. This is not an empty history. Evaluation viewer authority is required.',
  unavailable: 'Evaluations are temporarily unavailable.',
  transport: 'The evaluation request did not complete.',
  timeout: 'The evaluation request timed out.',
  'request-cancelled': 'The evaluation request was retired.',
  'invalid-response':
    'The evaluation response could not be validated. No retained reports are shown.',
  'unexpected-defect':
    'Evaluations could not be checked. No retained reports or diagnostic details are shown.',
};
function Failure({
  error,
  signInHref,
}: {
  readonly error: unknown;
  readonly signInHref: string;
}): ReactElement {
  const failure = normalizeEvaluationFailure(error);
  return (
    <div role="alert">
      <p>{failures[failure.kind]}</p>
      {failure.kind === 'authentication-required' && (
        <a className="font-bold underline" href={signInHref}>
          Sign in again
        </a>
      )}
    </div>
  );
}
function Artifact({
  label,
  value,
}: {
  readonly label: string;
  readonly value: EvaluationArtifact;
}): ReactElement {
  return (
    <div className="min-w-0 space-y-1">
      <h3 className="font-bold">{label}</h3>
      <p className="break-all">
        {value.key} / {value.revision}
      </p>
      <p className="break-all font-mono text-xs">SHA-256 {value.sha256}</p>
    </div>
  );
}
function Budget({
  label,
  unit,
  value,
}: {
  readonly label: string;
  readonly unit: string;
  readonly value: EvaluationBudgetDimension;
}): ReactElement {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="font-bold">
        {label}: {value.status}
      </h3>
      <dl className="mt-2 space-y-1">
        <dt>Limit ({unit})</dt>
        <dd>{value.limit === null ? 'Not configured' : String(value.limit)}</dd>
        <dt>Measured ({unit})</dt>
        <dd>{value.measured === null ? 'Unknown' : String(value.measured)}</dd>
      </dl>
      {value.reason !== null && (
        <p className="mt-2 break-words">Reason: {value.reason}</p>
      )}
    </div>
  );
}
function Report({
  report,
}: {
  readonly report: EvaluationReport;
}): ReactElement {
  return (
    <article aria-label="Exact evaluation report" className="min-w-0 space-y-6">
      <h2 className="text-2xl font-bold">
        Report {report.summary.passed ? 'PASS' : 'FAIL'}
      </h2>
      <p className="break-all font-mono text-sm">
        Report ID: {report.summary.reportId}
      </p>
      <p>
        Recorded{' '}
        <time dateTime={report.summary.recordedAt}>
          {report.summary.recordedAt}
        </time>
      </p>
      <section
        aria-label="Artifact provenance"
        className="min-w-0 space-y-4 rounded-lg border border-border bg-surface p-4"
      >
        <h2 className="text-xl font-bold">Artifact provenance</h2>
        <p className="break-all font-mono text-xs">
          Report SHA-256 {report.summary.reportDigest}
        </p>
        <Artifact label="Fixture" value={report.summary.fixture} />
        <Artifact label="Evaluator" value={report.evaluator} />
        <Artifact label="Assertions" value={report.assertions} />
        <p className="text-sm text-ink-muted">
          Server-reported digests; this view does not independently verify
          canonical bytes.
        </p>
      </section>
      <section aria-label="Assertion checks" className="space-y-3">
        <h2 className="text-xl font-bold">Assertion checks</h2>
        {report.checks.length === 0 ? (
          <p>No assertion checks recorded.</p>
        ) : (
          <ul className="grid min-w-0 gap-3 md:grid-cols-2">
            {report.checks.map((check) => (
              <li
                key={check.id}
                className="min-w-0 rounded-lg border border-border bg-surface p-4"
              >
                <h3 className="break-all font-bold">{check.id}</h3>
                <p>
                  {check.required ? 'Required' : 'Optional'} · {check.status}
                </p>
                <p className="break-words">Explanation: {check.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Simulated budgets" className="space-y-3">
        <h2 className="text-xl font-bold">Simulated budgets</h2>
        <p className="text-sm text-ink-muted">
          Currency nanos are billionths of a currency unit. Simulated latency
          excludes unmeasured overhead and is not live-provider performance.
          Unknown is not zero.
        </p>
        {report.budgets === null ? (
          <p>No budget configured.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Budget
              label="Cost"
              unit={`${report.budgets.currency} nanos`}
              value={report.budgets.cost}
            />
            <Budget
              label="Simulated latency"
              unit="nanoseconds"
              value={report.budgets.simulatedLatency}
            />
          </div>
        )}
      </section>
    </article>
  );
}
/** Host owns selection/cursor and must replace the private scope on every callback, focusing its persistent heading. No mutations or polling. */
export function EvaluationWorkspace({
  query,
  reportId,
  after,
  signInHref,
  onSelect,
  onOlder,
}: {
  readonly query: EvaluationQuery;
  readonly reportId: string | null;
  readonly after: string | null;
  readonly signInHref: string;
  readonly onSelect: (id: string) => void;
  readonly onOlder: (after: string) => void;
}): ReactElement {
  const history = evaluationApi.useHistoryQuery(
    { ...query, after },
    { skip: reportId !== null, refetchOnMountOrArgChange: true },
  );
  const detail = evaluationApi.useReportQuery(
    { ...query, reportId: reportId ?? '' },
    { skip: reportId === null, refetchOnMountOrArgChange: true },
  );
  const result = reportId === null ? history : detail;
  if (result.isUninitialized || result.isLoading || result.isFetching)
    return <p role="status">Checking evaluations…</p>;
  if (result.isError || result.currentData === undefined)
    return <Failure error={result.error} signInHref={signInHref} />;
  if (reportId !== null && detail.currentData !== undefined)
    return <Report report={detail.currentData} />;
  const page = history.currentData;
  return (
    <section aria-label="Evaluation history" className="min-w-0 space-y-4">
      <h2 className="text-2xl font-bold">Evaluation history</h2>
      <p className="text-sm text-ink-muted">
        Newest first. Pages are checked independently; this is not a snapshot of
        all reports.
      </p>
      {page?.items.length === 0 ? (
        <p>No evaluations in this checked page.</p>
      ) : (
        <ul className="grid min-w-0 gap-4 lg:grid-cols-2">
          {page?.items.map((item) => (
            <li
              key={item.reportId}
              className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4"
            >
              <h3 className="break-all font-bold">
                {item.fixture.key} / {item.fixture.revision}
              </h3>
              <p>Report {item.passed ? 'PASS' : 'FAIL'}</p>
              <p className="break-all text-sm">
                <time dateTime={item.recordedAt}>{item.recordedAt}</time>
              </p>
              <Button
                type="button"
                variant="quiet"
                onClick={() => onSelect(item.reportId)}
                aria-label={`Inspect report ${item.reportId}`}
              >
                Inspect report
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextAfter != null && (
        <Button
          type="button"
          variant="quiet"
          onClick={() => onOlder(page.nextAfter!)}
        >
          Older evaluations
        </Button>
      )}
    </section>
  );
}
