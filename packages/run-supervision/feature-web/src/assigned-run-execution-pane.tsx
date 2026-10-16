import type {
  AssignedRunConsole,
  AssignedRunRead,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode, RefObject } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { AssignedRunCapabilityExecution } from './assigned-run-capability-execution';
import { AssignedRunTransitionHistory } from './assigned-run-transition-history';
import { AssignedRunMessage } from './assigned-run-message';
import { formatRecordedAt, runStateLabels } from './run-supervision-copy';

export function AssignedRunExecutionPane({
  detail,
  selectedRunId,
  signInHref,
  heading,
  commandFeedback,
  isBlockingDisclosure,
  approvalControl,
  executionControl,
}: {
  readonly detail: AssignedRunRead<AssignedRunConsole>;
  readonly selectedRunId: string | null;
  readonly signInHref: string;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly commandFeedback?: ReactNode;
  readonly isBlockingDisclosure: boolean;
  readonly approvalControl?: ReactNode;
  readonly executionControl?: ReactNode;
}): ReactElement {
  function handleDetailRecheck(): void {
    // Recheck and recovery controls disappear when the fresh gate closes; the
    // persistent pane heading remains useful throughout pending and failure.
    heading.current?.focus();
    detail.recheck();
  }

  return (
    <section
      aria-labelledby="resolution-run-heading"
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
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
        {detail.phase === 'ready' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-highlight/60 bg-highlight/10 px-3 py-1.5 text-xs font-bold text-highlight">
              {runStateLabels[detail.data.state]}
            </span>
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={handleDetailRecheck}
            >
              Recheck selected run
            </Button>
          </div>
        ) : null}
      </div>
      {commandFeedback === undefined ? null : (
        <div className="mt-5">{commandFeedback}</div>
      )}
      {detail.phase === 'ready' ? (
        <>
          <div className="mt-5">{approvalControl}</div>
          <div className="mt-5">{executionControl}</div>
          <AssignedRunExecutionRecords run={detail.data} />
        </>
      ) : !isBlockingDisclosure ? (
        <div className="mt-5">
          <AssignedRunReadMessage
            detail={detail}
            selectedRunId={selectedRunId}
            signInHref={signInHref}
            onRetry={handleDetailRecheck}
          />
        </div>
      ) : null}
    </section>
  );
}

function AssignedRunReadMessage({
  detail,
  selectedRunId,
  signInHref,
  onRetry,
}: {
  readonly detail: AssignedRunRead<AssignedRunConsole>;
  readonly selectedRunId: string | null;
  readonly signInHref: string;
  readonly onRetry: () => void;
}): ReactElement {
  if (selectedRunId === null) {
    return (
      <AssignedRunMessage
        title="Select an assigned run"
        description="Choose a run from your assignment snapshot to inspect its recorded start, pinned policy, and current state."
      />
    );
  }
  if (detail.phase === 'pending') {
    return (
      <AssignedRunMessage
        title={
          detail.hasRetainedData
            ? 'Rechecking run access…'
            : 'Loading run context…'
        }
        description="Requesting a fresh exact-run snapshot. Retained private context is hidden until access and the response are checked."
      />
    );
  }
  if (detail.phase === 'failed') {
    return (
      <AssignedRunMessage
        title={
          detail.error.kind === 'not-found'
            ? 'Run context is unavailable'
            : 'Run context could not be read'
        }
        error={detail.error}
        signInHref={signInHref}
        retryLabel="Retry run read"
        onRetry={onRetry}
      />
    );
  }
  // Discovery owns recovery for its typed failure; a closed detail gate cannot
  // assume retry is offered (a rejected page requires reset instead).
  return (
    <AssignedRunMessage
      title="Run context hidden"
      description="Selected private detail is hidden while assigned work is being read or after that read fails. Check the assigned-work pane for access status and any available recovery."
    />
  );
}

function AssignedRunExecutionRecords({
  run,
}: {
  readonly run: AssignedRunConsole;
}): ReactElement {
  return (
    <>
      <p className="mt-3 font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">
        Run {run.runId}
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Recorded start, terminal receipt when supplied, and current state, not a
        live execution trace. No automatic polling; recheck deliberately to read
        a newer snapshot.
      </p>
      <ol className="mt-6 space-y-4" aria-label="Available durable run records">
        <li className="rounded-md border border-border bg-canvas/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-bold text-accent-strong">Run start recorded</h3>
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
            <AssignedRunFact label="Contract">
              {run.contractKey}
            </AssignedRunFact>
            <AssignedRunFact label="Contract revision">
              {run.contractRevision}
            </AssignedRunFact>
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
            The run records this capability and its policy inputs. A pinned step
            is not a recorded tool invocation, grant, or pending approval
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
      <div className="mt-5">
        <AssignedRunCapabilityExecution execution={run.execution} />
      </div>
      <div className="mt-5">
        <AssignedRunTransitionHistory transitions={run.transitions} />
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        This projection supports one pinned capability receipt, not an ordered
        multi-step trace. Nested tool spans, additional step transitions and
        real cost attribution are not included in this read model.
      </p>
    </>
  );
}
