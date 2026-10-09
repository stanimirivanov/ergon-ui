import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import {
  formatRecordedAt,
  isTerminalState,
  runStateLabels,
} from './run-supervision-copy';

const paneClass =
  'min-w-0 rounded-md border border-border bg-surface/90 p-4 xl:min-h-[calc(100vh-12rem)]';

export function AssignedRunConsoleView({
  console: run,
  onRecheck,
}: {
  readonly console: AssignedRunConsole;
  readonly onRecheck: () => void;
}): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const terminal = isTerminalState(run.state);

  useEffect(() => {
    heading.current?.focus();
  }, [run.runId]);

  return (
    <>
      <section aria-labelledby="resolution-run-heading" className={paneClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
              Durable run snapshot
            </p>
            <h2
              ref={heading}
              tabIndex={-1}
              id="resolution-run-heading"
              className="mt-2 text-2xl font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Resolution run
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-highlight/60 bg-highlight/10 px-3 py-1.5 text-xs font-bold text-highlight">
              {runStateLabels[run.state]}
            </span>
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={onRecheck}
            >
              Recheck selected run
            </Button>
          </div>
        </div>
        <p className="mt-3 font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">
          Run {run.runId}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Recorded start and current state, not a live execution trace. No
          automatic polling; recheck deliberately to read a newer snapshot.
        </p>
        <ol
          className="mt-6 space-y-4"
          aria-label="Available durable run records"
        >
          <li className="rounded-md border border-border bg-canvas/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-bold text-accent-strong">
                Run start recorded
              </h3>
              <span className="text-xs font-semibold text-ink-muted">
                Attempt {run.attemptNumber}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              <time dateTime={run.startedRecordedAt}>
                {formatRecordedAt(run.startedRecordedAt)}
              </time>
            </p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <RunFact label="Contract">{run.contractKey}</RunFact>
              <RunFact label="Contract revision">
                {run.contractRevision}
              </RunFact>
            </dl>
          </li>
          <li className="rounded-md border border-highlight/60 bg-highlight/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="min-w-0 font-bold text-ink [overflow-wrap:anywhere]">
                Pinned step · {run.stepId}
              </h3>
              <span className="rounded border border-highlight/50 px-2 py-1 text-xs font-bold text-highlight">
                {run.effectiveRisk} risk
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              The run records this capability and its policy inputs. A pinned
              step is not a recorded tool invocation, grant, or pending approval
              decision.
            </p>
            <details className="mt-4 rounded-md border border-border bg-surface/95 shadow-xl backdrop-blur-md">
              <summary className="cursor-pointer rounded-md px-4 py-3 text-sm font-bold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong">
                Inspect recorded execution policy
              </summary>
              <div className="border-t border-border p-4">
                <h4 className="font-bold text-ink">
                  Recorded capability policy · read only
                </h4>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <RunFact label="Capability">{run.capability}</RunFact>
                  <RunFact label="Effective risk">{run.effectiveRisk}</RunFact>
                  <RunFact label="Approval requirement">
                    {run.requiredApproval}
                  </RunFact>
                  <RunFact label="Policy revision">
                    {run.policyRevision}
                  </RunFact>
                </dl>
                <p className="mt-4 text-xs leading-5 text-ink-muted">
                  This inspector cannot authorize, limit scope, steer, or resume
                  execution. Approval requirements describe recorded policy, not
                  an approval you can issue here.
                </p>
              </div>
            </details>
          </li>
        </ol>
        <div className="mt-5 rounded-md border border-dashed border-border p-4">
          <h3 className="text-sm font-bold text-ink">
            Execution detail unavailable
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Ordered step execution, nested tool spans, latency, cost, and
            intermediate transitions are not included in this read model.
          </p>
        </div>
      </section>
      <section aria-labelledby="outcome-proof-heading" className={paneClass}>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
          Outcome visibility
        </p>
        <h2
          id="outcome-proof-heading"
          className="mt-2 text-xl font-extrabold tracking-tight"
        >
          Outcome proof
        </h2>
        <div className="mt-5 rounded-md border border-border bg-canvas/60 p-4">
          <h3 className="font-bold text-ink">
            {terminal
              ? 'Recorded terminal state · proof not included'
              : 'Outcome is not established by this view'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {terminal
              ? 'The control plane records this terminal run state. It is distinct from the browser inspecting an accepted proof or independently verifying the outcome.'
              : 'A current run state is not evidence that the desired outcome has been achieved.'}
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Verification checks and accepted proof are not included in this read
            model.
          </p>
        </div>
        <section
          aria-labelledby="run-state-heading"
          className="mt-4 rounded-md border border-border bg-canvas/60 p-4"
        >
          <h3 id="run-state-heading" className="font-bold">
            Recorded run state
          </h3>
          <dl className="mt-4 grid gap-4 text-sm">
            <RunFact label="State">{runStateLabels[run.state]}</RunFact>
            <RunFact label="State version">{run.stateVersion}</RunFact>
            <RunFact label="State recorded">
              <time dateTime={run.stateUpdatedAt}>
                {formatRecordedAt(run.stateUpdatedAt)}
              </time>
            </RunFact>
          </dl>
        </section>
        <section
          aria-labelledby="run-case-context-heading"
          className="mt-4 rounded-md border border-border bg-canvas/60 p-4"
        >
          <h3 id="run-case-context-heading" className="font-bold">
            Case context
          </h3>
          <dl className="mt-4 grid gap-4 text-sm">
            <RunFact label="Case ID">{run.caseId}</RunFact>
            <RunFact label="Pinned evidence stream version">
              {run.caseEvidenceStreamVersion}
            </RunFact>
            <RunFact label="Assigned">
              <time dateTime={run.assignedAt}>
                {formatRecordedAt(run.assignedAt)}
              </time>
            </RunFact>
            <RunFact label="Predecessor run">
              {run.predecessorRunId ?? 'No predecessor recorded'}
            </RunFact>
          </dl>
          <p className="mt-4 text-xs leading-5 text-ink-muted">
            Evidence is not included in this read model. The pinned stream
            version identifies the run snapshot; it is not a count of verified
            facts.
          </p>
        </section>
      </section>
    </>
  );
}

function RunFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
