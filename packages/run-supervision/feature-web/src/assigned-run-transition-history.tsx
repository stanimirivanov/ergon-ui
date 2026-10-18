import type { AssignedRunTransition } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { formatRecordedAt, runStateLabels } from './run-supervision-copy';

const eventLabels: Record<AssignedRunTransition['type'], string> = {
  CAPABILITY_SUCCEEDED: 'Capability success projected',
  CAPABILITY_FAILED: 'Capability failure projected',
  OUTCOME_PROOF_ACCEPTED: 'Outcome proof acceptance recorded',
  RETRY_STARTED: 'Retry handoff recorded',
  ESCALATION_REQUESTED: 'Escalation recorded',
  RUN_CANCELLED: 'Untouched-run cancellation recorded',
};

/** Current gated history only; the enclosing read lifecycle owns withdrawal and freshness. */
export function AssignedRunTransitionHistory({
  transitions,
}: {
  readonly transitions: readonly AssignedRunTransition[] | undefined;
}): ReactElement {
  return (
    <section
      aria-labelledby="recorded-transitions-heading"
      className="rounded-md border border-border bg-canvas/60 p-4"
    >
      <h3 id="recorded-transitions-heading" className="font-bold text-ink">
        Recorded run transitions
      </h3>
      {transitions === undefined ? (
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This server did not supply transition history. Do not infer events
          from the current state or connector receipt.
        </p>
      ) : transitions.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          No state transition has been recorded at this revision. A terminal
          receipt may exist before result projection.
        </p>
      ) : (
        <ol
          className="mt-4 space-y-4"
          aria-label="Sequence-ordered run transitions"
        >
          {transitions.map((event) => (
            <li
              key={event.sequence}
              className="rounded-md border border-border bg-surface/90 p-4"
            >
              <h4 className="font-bold text-accent-strong">
                {event.sequence} · {eventLabels[event.type]}
              </h4>
              <p className="mt-2 text-sm text-ink-muted">
                {runStateLabels[event.fromState]} →{' '}
                {runStateLabels[event.toState]}
              </p>
              <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                <AssignedRunFact label="Occurred">
                  <time dateTime={event.occurredAt}>
                    {formatRecordedAt(event.occurredAt)}
                  </time>
                </AssignedRunFact>
                <AssignedRunFact label="Event recorded">
                  <time dateTime={event.recordedAt}>
                    {formatRecordedAt(event.recordedAt)}
                  </time>
                </AssignedRunFact>
              </dl>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        Append sequence, not timestamp order, determines this history. These are
        durable state facts, not live tool spans or inspected proof evidence.
        Recheck explicitly for a newer revision.
      </p>
    </section>
  );
}
