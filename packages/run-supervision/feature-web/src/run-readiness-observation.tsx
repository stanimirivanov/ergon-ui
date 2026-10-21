import type { RunPinnedReadiness } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';
import { AssignedRunFact } from './assigned-run-fact';
import { PinnedBindingSource } from './assigned-run-evidence';

/** Render only a currently disclosed RTK observation; selected sources are inert citations, never authority, current case state or outcome proof. */
export function RunReadinessObservation({
  observation,
}: {
  readonly observation: RunPinnedReadiness;
}): ReactElement {
  const fact = observation.selectedEvidence[0];
  return (
    <section
      className="min-w-0 space-y-5"
      aria-label="Pinned readiness assessment"
    >
      <section
        role="status"
        className="rounded-md border border-accent-strong/50 bg-canvas/70 p-4"
      >
        <h4 className="font-bold text-accent-strong">
          {statusLabels[observation.status]}
        </h4>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          A current, version-labelled re-evaluation of fixed inputs — not stored
          historical planner reasoning or current-case readiness. READY does not
          authorize execution or establish accepted outcome proof.
        </p>
      </section>
      <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
        <AssignedRunFact label="Pinned contract">
          {observation.contractKey} · revision {observation.contractRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Pinned case">
          {observation.caseId}
        </AssignedRunFact>
        <AssignedRunFact label="Pinned case stream version">
          {observation.caseStreamVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Supervision epoch">
          {observation.supervisionRevision}
        </AssignedRunFact>
        <AssignedRunFact label="Evaluator">
          {observation.evaluator}
        </AssignedRunFact>
        <AssignedRunFact label="Authority observed at">
          <time dateTime={observation.observedAt}>
            {observation.observedAt}
          </time>
        </AssignedRunFact>
      </dl>
      {observation.status === 'WAITING_FOR_EVIDENCE' ? (
        <section
          aria-label="Missing required evidence"
          className="rounded-md border border-highlight/60 p-4"
        >
          <h4 className="font-bold">Missing required evidence</h4>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Missing names retain contract declaration order. Applicability is
            not assessed until every requirement exists; unsupported fact types
            remain missing rather than silently satisfied.
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-2 font-mono text-sm [overflow-wrap:anywhere]">
            {observation.missingEvidence.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ol>
        </section>
      ) : (
        <section
          aria-label="Assessed applicability"
          className="rounded-md border border-border p-4"
        >
          <h4 className="font-bold">Exact case-sensitive applicability</h4>
          <dl className="mt-3 grid gap-4 text-sm">
            <AssignedRunFact label="Fact">
              {observation.applicability.fact}
            </AssignedRunFact>
            <AssignedRunFact label="Expected value">
              <span className="whitespace-pre-wrap">
                {observation.applicability.expectedValue}
              </span>
            </AssignedRunFact>
            <AssignedRunFact label="Selected actual value">
              {observation.applicability.actualValue}
            </AssignedRunFact>
          </dl>
        </section>
      )}
      <section
        aria-label="Selected readiness evidence"
        className="min-w-0 space-y-4"
      >
        <h4 className="font-bold">Selected readiness evidence</h4>
        <p className="text-sm leading-6 text-ink-muted">
          Latest required supported binding in stream order at or before the
          pin. This selection is independent of the first-100 history window; it
          is not the latest case value. No contradiction or confidence is
          inferred.
        </p>
        {fact === undefined ? (
          <p className="text-sm">
            No required supported binding selected. This is not an empty case or
            an unavailable-data result.
          </p>
        ) : (
          <article className="min-w-0 space-y-4 rounded-md border border-border bg-surface/70 p-4">
            <h4 className="font-mono font-bold [overflow-wrap:anywhere]">
              Selected binding #{fact.streamVersion} · {fact.value}
            </h4>
            <dl className="grid gap-4 text-sm">
              <AssignedRunFact label="Subject">
                {fact.accountReference}
              </AssignedRunFact>
              <AssignedRunFact label="Bound at">
                <time dateTime={fact.boundAt}>{fact.boundAt}</time>
              </AssignedRunFact>
              <AssignedRunFact label="Binding recorded at">
                <time dateTime={fact.recordedAt}>{fact.recordedAt}</time>
              </AssignedRunFact>
            </dl>
            <PinnedBindingSource fact={fact} />
          </article>
        )}
      </section>
      <p className="text-sm leading-6 text-ink-muted">
        This read does not check connector availability, reference registration,
        effective policy, grants, side effects or case closure. Observation and
        recording timestamps are not durations or selection order.
      </p>
    </section>
  );
}

const statusLabels = {
  READY: 'Ready at pinned boundary',
  NOT_APPLICABLE: 'Not applicable at pinned boundary',
  WAITING_FOR_EVIDENCE: 'Waiting for pinned evidence',
} as const;
