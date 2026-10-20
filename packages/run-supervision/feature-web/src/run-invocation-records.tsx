import type {
  RunInvocationHistory,
  RunInvocationPreparation,
} from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';
import { formatGatewayLatency } from './execution-measurement-copy';
import { AssignedRunFact } from './assigned-run-fact';

/** Facts from the current RTK observation only. No totals, command correlations, live status or UTC-derived durations. */
export function RunInvocationRecords({
  history,
}: {
  readonly history: RunInvocationHistory;
}): ReactElement {
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm leading-6 text-ink-muted">
        Access observed at{' '}
        <time dateTime={history.observedAt} className="wrap-anywhere">
          {history.observedAt}
        </time>
        {' · '}Current supervision epoch {history.supervisionRevision}.
        Authority is checked at observation time, not continuously.
      </p>
      <p className="text-sm leading-6 text-ink-muted">
        Partial coverage: historical and older-writer calls are not
        reconstructed. Recording order is not causal order or a stable
        cross-read prefix. Preparation does not prove dispatch. Rows cannot be
        matched to browser admissions.
      </p>
      {history.entries.length === 0 ? (
        <p role="status" className="rounded-md border border-border p-4">
          No gateway preparations recorded in this observation. This does not
          prove that no call or external effect occurred.
        </p>
      ) : (
        <>
          {history.truncated ? (
            <p
              role="status"
              className="rounded-md border border-highlight/60 bg-highlight/5 p-3 text-sm leading-6"
            >
              Truncated history: 100 preparations shown. More records exist; no
              total or stable prefix is promised.
            </p>
          ) : null}
          <ol aria-label="Recorded gateway preparations" className="space-y-4">
            {history.entries.map((entry, index) => (
              // No public row identity exists. Position keys have no persistent interaction or causal meaning.
              <li
                key={index}
                className="min-w-0 rounded-md border border-border bg-canvas/50 p-4"
              >
                <GatewayPreparation entry={entry} />
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="text-sm leading-6 text-ink-muted">
        The winning run receipt, run state and independent outcome proof remain
        separate. Concurrent callers retain separate samples. No duration total,
        cost, execution permission or safe retry is inferred.
      </p>
    </div>
  );
}

const completionLabels = {
  SUCCEEDED: 'Gateway reported success',
  FAILED: 'Gateway reported failure',
  UNKNOWN: 'Gateway effects unresolved',
} as const;

function GatewayPreparation({
  entry,
}: {
  readonly entry: RunInvocationPreparation;
}): ReactElement {
  const completion = entry.completion;
  return (
    <>
      <h4 className="font-bold text-accent-strong wrap-anywhere">
        {entry.stepId} · {entry.capability}
      </h4>
      <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
        <AssignedRunFact label="Connector">{entry.connector}</AssignedRunFact>
        <AssignedRunFact label="Prepared at">
          <time dateTime={entry.preparedAt}>{entry.preparedAt}</time>
        </AssignedRunFact>
        <AssignedRunFact label="Preparation recorded at">
          <time dateTime={entry.recordedAt}>{entry.recordedAt}</time>
        </AssignedRunFact>
      </dl>
      <p className="mt-4 font-bold">
        {completion === null
          ? 'No completion recorded'
          : completionLabels[completion.outcome]}
      </p>
      {completion === null ? (
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          This is not live or in-flight status, no-effect evidence or a
          zero-duration sample. A crash may precede dispatch.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {completion.outcome === 'UNKNOWN'
              ? 'The gateway call threw. Provider effects remain unresolved; this is not a terminal provider failure or permission to retry.'
              : 'This is the gateway-reported result, not independent verification or current run state.'}
          </p>
          <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
            <AssignedRunFact label="Measured gateway call">
              {formatGatewayLatency(completion.timing.elapsedNanoseconds)}
            </AssignedRunFact>
            <AssignedRunFact label="Exact elapsed nanoseconds">
              {completion.timing.elapsedNanoseconds}
            </AssignedRunFact>
            <AssignedRunFact label="Call started at">
              <time dateTime={completion.timing.startedAt}>
                {completion.timing.startedAt}
              </time>
            </AssignedRunFact>
            <AssignedRunFact label="Completed at">
              <time dateTime={completion.completedAt}>
                {completion.completedAt}
              </time>
            </AssignedRunFact>
            <AssignedRunFact label="Completion recorded at">
              <time dateTime={completion.recordedAt}>
                {completion.recordedAt}
              </time>
            </AssignedRunFact>
            <AssignedRunFact label="Measurement source">
              {completion.timing.source}
            </AssignedRunFact>
          </dl>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Monotonic measurement around this gateway call, excluding database
            work. UTC observations may move backwards; they are not duration
            inputs.
          </p>
        </>
      )}
    </>
  );
}
