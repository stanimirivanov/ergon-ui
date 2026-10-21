import type {
  AssignedRunConsole,
  AssignedRunRead,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode, RefObject } from 'react';

import { AssignedRunAttemptContext } from './assigned-run-attempt-context';
import { AssignedRunExecutionRecords } from './assigned-run-execution-records';
import { AssignedRunMessage } from './assigned-run-message';
import { runStateLabels } from './run-supervision-copy';

/**
 * Composes disclosed execution facts before actions, inspection and relationships.
 * Only a ready detail gate mounts private sections; the heading survives gate
 * closure for focus and recovery. Each supplied slot has a separate wrapper:
 * resource keys can legitimately match across independent controls/inspectors.
 * This presentation never decides command eligibility or opens an inspector.
 */
export function AssignedRunExecutionPane({
  detail,
  selectedRunId,
  signInHref,
  heading,
  commandFeedback,
  isBlockingDisclosure,
  approvalControl,
  executionControl,
  retryControl,
  escalationControl,
  cancellationControl,
  executionHistory,
  invocationHistory,
  pinnedContract,
  pinnedReadiness,
  retrySuccessor,
  onInspectPredecessor,
  onReturnToAttempt,
}: {
  readonly detail: AssignedRunRead<AssignedRunConsole>;
  readonly selectedRunId: string | null;
  readonly signInHref: string;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly commandFeedback?: ReactNode;
  readonly isBlockingDisclosure: boolean;
  readonly approvalControl?: ReactNode;
  readonly executionControl?: ReactNode;
  readonly retryControl?: ReactNode;
  readonly escalationControl?: ReactNode;
  readonly cancellationControl?: ReactNode;
  readonly executionHistory?: ReactNode;
  readonly invocationHistory?: ReactNode;
  readonly pinnedContract?: ReactNode;
  readonly pinnedReadiness?: ReactNode;
  readonly retrySuccessor?: ReactNode;
  readonly onInspectPredecessor: () => void;
  readonly onReturnToAttempt?: () => void;
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
      {onReturnToAttempt === undefined ? null : (
        <div className="mt-5 rounded-md border border-border p-3">
          <Button
            type="button"
            variant="quiet"
            size="compact"
            onClick={onReturnToAttempt}
          >
            Return to originating attempt
          </Button>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Return requests fresh access; it does not restore an earlier
            snapshot.
          </p>
        </div>
      )}
      {commandFeedback === undefined ? null : (
        <div className="mt-5">{commandFeedback}</div>
      )}
      {detail.phase === 'ready' ? (
        <>
          <div className="mt-5">
            <AssignedRunExecutionRecords run={detail.data} />
          </div>
          <section
            aria-label="Run actions"
            className="mt-6 border-t border-border pt-5"
          >
            <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
              Run actions
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Inspect current eligibility before confirming a command. Recorded
              results above do not grant authority or permission to retry.
            </p>
            <div className="mt-5 space-y-5">
              <div>{approvalControl}</div>
              <div>{executionControl}</div>
              <div>{retryControl}</div>
              <div>{escalationControl}</div>
              <div>{cancellationControl}</div>
            </div>
          </section>
          <section
            aria-label="Supporting inspection"
            className="mt-6 border-t border-border pt-5"
          >
            <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
              Supporting inspection
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Open protected records deliberately. Each inspector checks fresh
              access; inspecting history or pinned inputs does not execute work.
            </p>
            <div className="mt-5 space-y-5">
              <div>{pinnedContract}</div>
              <div>{pinnedReadiness}</div>
              <div>{executionHistory}</div>
              <div>{invocationHistory}</div>
            </div>
          </section>
          <div className="mt-6 border-t border-border pt-5">
            <AssignedRunAttemptContext
              run={detail.data}
              onInspectPredecessor={onInspectPredecessor}
              successorLookup={retrySuccessor}
            />
          </div>
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
