import {
  normalizeRunSupervisionFailure,
  useLazyGetAssignedRunConsoleQuery,
  useLazyListAssignedRunsQuery,
  type AssignedRunCursor,
} from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import { AssignedRunConsoleView } from './assigned-run-console';
import { AssignedRunList } from './assigned-run-list';
import { AssignedRunMessage } from './assigned-run-message';

interface AssignedRunWorkspaceProps {
  readonly tenantId: string;
  /** App-composed same-origin login URL; never derived from a problem response. */
  readonly signInHref: string;
  /** Verified actor display only, not evidence of supervisor authority. */
  readonly presence?: ReactNode;
  readonly onReturnToFollowUps?: () => void;
}

/**
 * Inspects server-assigned runs beneath the app's verified-session boundary.
 * Selection and page cursors are local, never URL or persistent state. A fresh
 * discovery/read hides retained private detail; failed discovery unmounts and
 * evicts it without discarding retry intent. Terminal detail may remain selected
 * after it leaves active discovery, but only a fresh exact-run read permits it.
 * This snapshot workspace grants neither an exclusive lease nor execution power.
 */
export function AssignedRunWorkspace(
  props: AssignedRunWorkspaceProps,
): ReactElement {
  // A tenant switch retires all local selection and traversal intent together.
  return <TenantAssignedRunWorkspace key={props.tenantId} {...props} />;
}

function TenantAssignedRunWorkspace({
  tenantId,
  signInHref,
  presence,
  onReturnToFollowUps,
}: AssignedRunWorkspaceProps): ReactElement {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const retiredDetailRead = useRef<Promise<void>>(Promise.resolve());
  const [cursors, setCursors] = useState<readonly AssignedRunCursor[]>([]);
  const cursor = cursors.at(-1);
  const [readAssigned, assigned] = useLazyListAssignedRunsQuery();
  const latestAssignmentRead = useRef<ReturnType<typeof readAssigned> | null>(
    null,
  );
  const isCurrentPage =
    assigned.originalArgs?.tenantId === tenantId &&
    assigned.originalArgs.cursor?.assignedAt === cursor?.assignedAt &&
    assigned.originalArgs.cursor?.assignmentId === cursor?.assignmentId;
  const isReadingAssigned =
    assigned.isUninitialized || !isCurrentPage || assigned.isFetching;
  const canReadDetail =
    !isReadingAssigned &&
    assigned.error === undefined &&
    assigned.currentData !== undefined;
  const assignedFailure =
    assigned.error === undefined
      ? undefined
      : normalizeRunSupervisionFailure(assigned.error);

  const recheckAssigned = useCallback((): void => {
    latestAssignmentRead.current = readAssigned(
      { tenantId, ...(cursor === undefined ? {} : { cursor }) },
      false,
    );
  }, [readAssigned, tenantId, cursor]);

  useEffect(() => {
    let isMounted = true;
    // Defer request acquisition so StrictMode's abandoned effect never starts
    // an otherwise shared pending read. A retired view cannot publish its page.
    void Promise.resolve().then(() => {
      if (isMounted) recheckAssigned();
    });
    return () => {
      isMounted = false;
      latestAssignmentRead.current?.abort();
      latestAssignmentRead.current?.unsubscribe();
      latestAssignmentRead.current = null;
    };
  }, [recheckAssigned]);

  return (
    <div className="resolver-console-workspace min-h-screen min-w-0 bg-canvas text-ink">
      <header className="flex min-h-16 flex-wrap items-center gap-4 border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3 border-r border-border pr-5">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md border border-accent font-bold text-accent-strong"
          >
            E
          </span>
          <span className="text-lg font-extrabold tracking-tight">Ergon</span>
        </div>
        <h1 className="min-w-0 flex-1 text-2xl font-extrabold tracking-tight">
          Resolver Console
        </h1>
        <span className="rounded-md border border-accent/60 bg-accent/10 px-3 py-1 text-xs font-bold tracking-wide text-accent-strong uppercase">
          Assigned · read only
        </span>
        {onReturnToFollowUps === undefined ? null : (
          <Button
            type="button"
            variant="quiet"
            size="compact"
            onClick={onReturnToFollowUps}
          >
            Back to follow-ups
          </Button>
        )}
      </header>
      <section
        aria-label="Supervisor presence"
        className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface/90 px-4 py-3 sm:mx-4 lg:mx-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Supervisor workspace
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Assignment and current resolver authority are checked by the control
            plane. This is a snapshot, not a control lease.
          </p>
        </div>
        {presence}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="quiet"
            size="compact"
            disabled={isReadingAssigned}
            onClick={recheckAssigned}
          >
            Recheck assigned runs
          </Button>
          {selectedRunId === null ? null : (
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={() => setSelectedRunId(null)}
            >
              Close run
            </Button>
          )}
        </div>
      </section>
      <div className="grid min-w-0 gap-3 px-3 py-4 sm:px-4 lg:px-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.8fr)_minmax(0,1.05fr)]">
        <AssignedRunList
          page={assigned.currentData}
          selectedRunId={selectedRunId}
          isFetching={isReadingAssigned}
          error={assignedFailure}
          signInHref={signInHref}
          hasPrevious={cursors.length > 0}
          onSelect={setSelectedRunId}
          onRetry={recheckAssigned}
          onResetPage={() => {
            setSelectedRunId(null);
            // Reset even on a rejected first page, where changing the cursor
            // would not cause a new request. Existing request retirement stays
            // owned by the cursor effect for later pages.
            if (cursors.length === 0) recheckAssigned();
            else setCursors([]);
          }}
          onPrevious={() => setCursors((previous) => previous.slice(0, -1))}
          onNext={() => {
            const next = assigned.currentData?.nextCursor;
            if (next != null) setCursors((previous) => [...previous, next]);
          }}
        />
        {selectedRunId === null ? (
          <ConsoleUnavailable
            title="Select an assigned run"
            description="Choose a run from your assignment snapshot to inspect its recorded start, pinned policy, and current state."
            focusHeading
          />
        ) : canReadDetail ? (
          <AssignedRunDetail
            key={selectedRunId}
            tenantId={tenantId}
            runId={selectedRunId}
            signInHref={signInHref}
            retiredRead={retiredDetailRead}
          />
        ) : (
          <ConsoleUnavailable
            title="Run context hidden"
            description="Selected private detail is hidden while assigned work is being read or after that read fails. Retry assigned runs to recheck access."
          />
        )}
      </div>
    </div>
  );
}

function AssignedRunDetail({
  tenantId,
  runId,
  signInHref,
  retiredRead,
}: {
  readonly tenantId: string;
  readonly runId: string;
  readonly signInHref: string;
  readonly retiredRead: RefObject<Promise<void>>;
}): ReactElement {
  const [readConsole, detail] = useLazyGetAssignedRunConsoleQuery();
  const latestRead = useRef<ReturnType<typeof readConsole> | null>(null);
  const readFresh = useCallback((): void => {
    latestRead.current = readConsole({ tenantId, runId }, false);
  }, [readConsole, tenantId, runId]);

  useEffect(() => {
    let isMounted = true;
    // RTK deduplicates even force-refetched same-key pending reads. Reopening
    // waits until our retired request settles before starting a distinct check.
    // Deferred start also skips StrictMode's abandoned first effect safely.
    void retiredRead.current.then(() => {
      if (isMounted) readFresh();
    });
    return () => {
      isMounted = false;
      const request = latestRead.current;
      if (request !== null) {
        request.abort();
        request.unsubscribe();
        retiredRead.current = request.then(() => undefined);
        latestRead.current = null;
      }
    };
  }, [readFresh, retiredRead]);

  if (detail.isUninitialized || detail.isFetching) {
    return (
      <ConsoleUnavailable
        title={
          detail.currentData === undefined
            ? 'Loading run context…'
            : 'Rechecking run access…'
        }
        description="Requesting a fresh exact-run snapshot. Retained private context is hidden until access and the response are checked."
      />
    );
  }
  if (detail.error !== undefined) {
    const failure = normalizeRunSupervisionFailure(detail.error);
    return (
      <ConsoleUnavailable
        title={
          failure.kind === 'not-found'
            ? 'Run context is unavailable'
            : 'Run context could not be read'
        }
        error={failure}
        signInHref={signInHref}
        retryLabel="Retry run read"
        onRetry={readFresh}
      />
    );
  }
  if (detail.currentData === undefined) {
    return (
      <ConsoleUnavailable
        title="Run context is unavailable"
        description="No private run context can be displayed for this request."
      />
    );
  }
  return (
    <AssignedRunConsoleView
      console={detail.currentData}
      onRecheck={readFresh}
    />
  );
}

function ConsoleUnavailable({
  focusHeading = false,
  ...props
}: Parameters<typeof AssignedRunMessage>[0] & {
  readonly focusHeading?: boolean;
}): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading]);
  return (
    <>
      <section
        aria-labelledby="resolution-run-heading"
        className="min-w-0 rounded-md border border-border bg-surface/90 p-4"
      >
        <h2
          ref={heading}
          tabIndex={-1}
          id="resolution-run-heading"
          className="mb-5 text-2xl font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          Resolution run
        </h2>
        <AssignedRunMessage {...props} />
      </section>
      <section
        aria-labelledby="outcome-proof-heading"
        className="min-w-0 rounded-md border border-border bg-surface/90 p-4"
      >
        <h2 id="outcome-proof-heading" className="text-xl font-extrabold">
          Outcome proof
        </h2>
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          No private run state or proof is displayed without a successful
          current read.
        </p>
      </section>
    </>
  );
}
