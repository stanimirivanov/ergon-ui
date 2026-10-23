import type { AssignedRunExecution } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { formatGatewayLatency } from './execution-measurement-copy';
import { formatRecordedAt } from './run-supervision-copy';

/**
 * Renders only a currently disclosed receipt. The enclosing fresh-read gate
 * owns withdrawal; this section retains neither remote data nor a live timer.
 */
export function AssignedRunCapabilityExecution({
  execution,
}: {
  readonly execution: AssignedRunExecution | null | undefined;
}): ReactElement {
  if (execution === undefined || execution === null) {
    return (
      <section
        aria-label="Capability execution"
        className="rounded-md border border-dashed border-border p-3"
      >
        <h3 className="font-bold text-ink">
          {execution === undefined
            ? 'Execution detail unavailable'
            : 'No terminal result recorded'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          {execution === undefined
            ? 'This server did not supply the execution projection. Whether a terminal receipt exists is unknown; latency and cost cannot be inferred.'
            : 'This snapshot contains no terminal execution receipt. That does not prove that no external effect occurred. Latency and cost are unavailable.'}
        </p>
      </section>
    );
  }

  const timing = execution.timing;
  return (
    <section
      aria-labelledby="capability-execution-heading"
      className="rounded-md border border-border bg-canvas/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-strong/40 px-3 py-3">
        <h3 id="capability-execution-heading" className="font-bold text-ink">
          Connector result recorded
        </h3>
        <span
          className={
            execution.outcome === 'SUCCEEDED'
              ? 'rounded border border-highlight/60 bg-highlight/10 px-2 py-1 text-xs font-bold text-highlight'
              : 'rounded border border-accent-strong/60 bg-accent-strong/10 px-2 py-1 text-xs font-bold text-accent-strong'
          }
        >
          {execution.outcome === 'SUCCEEDED'
            ? 'Connector succeeded'
            : 'Connector failed'}
        </span>
      </div>
      <p className="px-3 pt-3 text-xs leading-5 text-ink-muted">
        Terminal result for the pinned step and capability. Recording a result
        does not advance the displayed run state. Connector success is not
        outcome proof.
      </p>
      <dl className="grid gap-x-4 gap-y-3 p-3 text-sm sm:grid-cols-2">
        <AssignedRunFact label="Connector">
          {execution.connector}
        </AssignedRunFact>
        <AssignedRunFact label="Gateway-call latency">
          <span className="font-mono font-bold tabular-nums">
            {timing === null
              ? 'Unmeasured'
              : formatGatewayLatency(timing.elapsedNanoseconds)}
          </span>
        </AssignedRunFact>
        <AssignedRunFact label="Completed">
          <time dateTime={execution.completedAt}>
            {formatRecordedAt(execution.completedAt)}
          </time>
        </AssignedRunFact>
        <AssignedRunFact label="Receipt recorded">
          <time dateTime={execution.recordedAt}>
            {formatRecordedAt(execution.recordedAt)}
          </time>
        </AssignedRunFact>
        <AssignedRunFact label="Cost">Not measured</AssignedRunFact>
      </dl>
      {timing === null ? (
        <p className="border-t border-border p-3 text-xs leading-5 text-ink-muted">
          This receipt has no timing measurement, including receipts from older
          writers. Unmeasured is not zero; timestamps cannot reconstruct it.
        </p>
      ) : (
        <details className="border-t border-border">
          <summary className="cursor-pointer rounded-md px-3 py-2 text-sm font-bold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong">
            Inspect execution measurement
          </summary>
          <div className="border-t border-border p-3">
            <dl className="grid gap-4 text-sm">
              <AssignedRunFact label="Measurement source">
                {timing.source}
              </AssignedRunFact>
              <AssignedRunFact label="Exact duration (nanoseconds)">
                {timing.elapsedNanoseconds}
              </AssignedRunFact>
              <AssignedRunFact label="Call start observation">
                <time dateTime={timing.startedAt}>
                  {formatRecordedAt(timing.startedAt)}
                </time>
              </AssignedRunFact>
            </dl>
            <p className="mt-4 text-xs leading-5 text-ink-muted">
              Monotonic duration of the winning receipt caller’s gateway call,
              not provider-operation latency, aggregated retries or billing.
              Nanosecond units do not promise nanosecond clock resolution.
              Wall-clock correction can put the start observation after
              completion; latency is never calculated from those timestamps.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}
