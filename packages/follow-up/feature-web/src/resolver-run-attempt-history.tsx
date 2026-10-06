import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import type { ReactElement, ReactNode } from 'react';

type RunAttempt = ResolverFollowUpCaseSummary['runHistory']['attempts'][number];

const recordedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/**
 * Discloses durable run records in attempt order. The event sequence and
 * timestamps come from the authorized snapshot, not a live execution stream.
 */
export function ResolverRunAttemptHistory({
  attempts,
}: {
  readonly attempts: ResolverFollowUpCaseSummary['runHistory']['attempts'];
}): ReactElement {
  return (
    <ol
      className="mt-5 grid gap-3 border-l-2 border-accent/45 pl-4"
      aria-label="Resolution attempts"
    >
      {attempts.map((attempt) => (
        <li
          key={attempt.runId}
          className="relative min-w-0 rounded-md border border-border bg-canvas/75 p-4 before:absolute before:top-5 before:-left-[1.36rem] before:size-2.5 before:rounded-full before:bg-accent"
        >
          <details className="group">
            <summary
              aria-label={`Attempt ${attempt.attemptNumber} · ${attempt.state} record`}
              className="cursor-pointer list-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-ink">
                  Attempt {attempt.attemptNumber} · {attempt.state}
                </h4>
                <time
                  className="text-xs text-ink-muted"
                  dateTime={attempt.stateUpdatedAt}
                >
                  {formatUtcInstant(attempt.stateUpdatedAt)}
                </time>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {attempt.capabilityResult.connector} reported{' '}
                {attempt.capabilityResult.outcome} at{' '}
                <time dateTime={attempt.capabilityResult.completedAt}>
                  {formatUtcInstant(attempt.capabilityResult.completedAt)}
                </time>
                .
              </p>
              {attempt.retry === null ? null : (
                <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-accent-strong">
                  Retry occurred at{' '}
                  <time dateTime={attempt.retry.occurredAt}>
                    {formatUtcInstant(attempt.retry.occurredAt)}
                  </time>
                  ; a successor attempt was started.
                </p>
              )}
              <span className="mt-3 inline-block text-xs font-semibold text-accent-strong group-open:hidden">
                Show recorded events
              </span>
              <span className="mt-3 hidden text-xs font-semibold text-accent-strong group-open:inline-block">
                Hide recorded events
              </span>
            </summary>
            <AttemptRecord attempt={attempt} />
          </details>
        </li>
      ))}
    </ol>
  );
}

function AttemptRecord({
  attempt,
}: {
  readonly attempt: RunAttempt;
}): ReactElement {
  return (
    <div className="mt-4 min-w-0 border-t border-border pt-4">
      <p className="text-xs leading-5 text-ink-muted">
        These are durable records, not live tool calls or measured latency.
      </p>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <AttemptFact label="Run ID">
          <code className="break-all">{attempt.runId}</code>
        </AttemptFact>
        <AttemptFact label="Start recorded">
          <time dateTime={attempt.startedRecordedAt}>
            {formatUtcInstant(attempt.startedRecordedAt)}
          </time>
        </AttemptFact>
        {attempt.predecessorRunId === null ? null : (
          <AttemptFact label="Predecessor run ID">
            <code className="break-all">{attempt.predecessorRunId}</code>
          </AttemptFact>
        )}
        <AttemptFact label="Final run state">
          {attempt.state} · version {attempt.stateVersion} at{' '}
          <time dateTime={attempt.stateUpdatedAt}>
            {formatUtcInstant(attempt.stateUpdatedAt)}
          </time>
        </AttemptFact>
      </dl>
      <ol
        aria-label={`Recorded events for attempt ${attempt.attemptNumber}`}
        className="mt-4 grid gap-3"
      >
        <li className="min-w-0 rounded-md border border-border bg-surface/70 p-3">
          <p className="text-sm font-semibold text-ink">
            Event {attempt.capabilityResult.sequence} · connector failure
          </p>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <AttemptFact label="State transition">
              <code className="break-all">
                {attempt.capabilityResult.fromState} →{' '}
                {attempt.capabilityResult.toState}
              </code>
            </AttemptFact>
            <AttemptFact label="Connector result">
              {attempt.capabilityResult.connector} ·{' '}
              {attempt.capabilityResult.outcome}
            </AttemptFact>
            <AttemptFact label="Completed">
              <time dateTime={attempt.capabilityResult.completedAt}>
                {formatUtcInstant(attempt.capabilityResult.completedAt)}
              </time>
            </AttemptFact>
            <AttemptFact label="Recorded">
              <time dateTime={attempt.capabilityResult.recordedAt}>
                {formatUtcInstant(attempt.capabilityResult.recordedAt)}
              </time>
            </AttemptFact>
          </dl>
        </li>
        {attempt.retry === null ? null : (
          <li className="min-w-0 rounded-md border border-border bg-surface/70 p-3">
            <p className="text-sm font-semibold text-ink">
              Event {attempt.retry.sequence} · retry started successor
            </p>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <AttemptFact label="Successor run ID">
                <code className="break-all">
                  {attempt.retry.replacementRunId}
                </code>
              </AttemptFact>
              <AttemptFact label="Occurred">
                <time dateTime={attempt.retry.occurredAt}>
                  {formatUtcInstant(attempt.retry.occurredAt)}
                </time>
              </AttemptFact>
              <AttemptFact label="Recorded">
                <time dateTime={attempt.retry.recordedAt}>
                  {formatUtcInstant(attempt.retry.recordedAt)}
                </time>
              </AttemptFact>
            </dl>
          </li>
        )}
      </ol>
    </div>
  );
}

function AttemptFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  );
}

function formatUtcInstant(value: string): string {
  return `${recordedAtFormatter.format(new Date(value))} UTC`;
}
