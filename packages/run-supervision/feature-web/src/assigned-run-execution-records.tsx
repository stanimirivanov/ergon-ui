import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { AssignedRunCapabilityExecution } from './assigned-run-capability-execution';
import { AssignedRunTransitionHistory } from './assigned-run-transition-history';
import { formatRecordedAt } from './run-supervision-copy';

/**
 * Presents only facts in the currently disclosed snapshot, ahead of commands.
 * The parent must unmount this section whenever its private read gate closes.
 * Recording order does not establish a live trace, causal spans or outcome proof.
 */
export function AssignedRunExecutionRecords({
  run,
}: {
  readonly run: AssignedRunConsole;
}): ReactElement {
  return (
    <section aria-label="Recorded execution" className="min-w-0">
      <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
        Recorded execution
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">
          Run {run.runId}
        </p>
        <dl className="text-xs">
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="font-semibold text-ink-muted">Snapshot revision</dt>
            <dd className="font-mono font-bold text-ink">{run.stateVersion}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">
        Recorded start, terminal receipt when supplied, and current state, not a
        live execution trace. No automatic polling; recheck deliberately to read
        a newer snapshot.
      </p>
      <ol
        className="mt-4 divide-y divide-border border-y border-border"
        aria-label="Available durable run records"
      >
        <li className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-bold text-accent-strong">Run start recorded</h3>
            <span className="rounded border border-border bg-canvas px-2 py-1 text-xs font-semibold text-ink-muted">
              Attempt {run.attemptNumber}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            <time dateTime={run.startedRecordedAt}>
              {formatRecordedAt(run.startedRecordedAt)}
            </time>
          </p>
          <dl className="mt-3 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 text-sm">
            <AssignedRunFact label="Contract">
              {run.contractKey}
            </AssignedRunFact>
            <AssignedRunFact label="Contract revision">
              {run.contractRevision}
            </AssignedRunFact>
          </dl>
        </li>
        <li className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 font-bold text-ink [overflow-wrap:anywhere]">
              Pinned step · {run.stepId}
            </h3>
            <span className="rounded border border-highlight/50 px-2 py-1 text-xs font-bold text-highlight">
              {run.effectiveRisk} risk
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            The run records this capability and its policy inputs. A pinned step
            is not a recorded tool invocation, grant, or pending approval
            decision.
          </p>
          <details className="mt-3 rounded-md border border-border bg-canvas/60">
            <summary className="cursor-pointer rounded-md px-3 py-2 text-sm font-bold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong">
              Inspect recorded execution policy
            </summary>
            <div className="border-t border-border p-3">
              <h4 className="font-bold text-ink">
                Recorded capability policy · read only
              </h4>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <AssignedRunFact label="Capability">
                  {run.capability}
                </AssignedRunFact>
                <AssignedRunFact label="Effective risk">
                  {run.effectiveRisk}
                </AssignedRunFact>
                <AssignedRunFact label="Approval requirement">
                  {run.requiredApproval}
                </AssignedRunFact>
                <AssignedRunFact label="Policy revision">
                  {run.policyRevision}
                </AssignedRunFact>
              </dl>
              <p className="mt-4 text-xs leading-5 text-ink-muted">
                This inspector cannot authorize, limit scope, steer, or resume
                execution. Approval requirements describe recorded policy, not a
                current approval decision. Use the separate human approval
                review for supported, eligible requests.
              </p>
            </div>
          </details>
        </li>
      </ol>
      <div className="mt-4">
        <AssignedRunCapabilityExecution execution={run.execution} />
      </div>
      <div className="mt-4">
        <AssignedRunTransitionHistory transitions={run.transitions} />
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        This projection supports one pinned capability receipt, not an ordered
        multi-step trace. Nested tool spans, additional step transitions and
        real cost attribution are not included in this read model.
      </p>
    </section>
  );
}
