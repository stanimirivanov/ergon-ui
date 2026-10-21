import type {
  AssignedRunConsole,
  RunPinnedContract,
  ContractCondition,
} from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

/** Renders only the currently gated RTK observation. Declaration order is not execution order; equality and untrusted text are preserved without HTML/YAML reconstruction. */
export function RunContractDefinition({
  observation,
  run,
}: {
  readonly observation: RunPinnedContract;
  readonly run: AssignedRunConsole;
}): ReactElement {
  const definition = observation.contract;
  return (
    <div className="min-w-0 space-y-5 text-sm leading-6 [overflow-wrap:anywhere]">
      <section aria-label="Immutable contract identity">
        <h4 className="text-lg font-extrabold">
          {definition.key} · revision {definition.revision}
        </h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-bold">Schema</dt>
            <dd className="font-mono text-xs">{definition.schema}</dd>
          </div>
          <div>
            <dt className="font-bold">Supervision observation</dt>
            <dd>
              Epoch {observation.supervisionRevision} ·{' '}
              <time dateTime={observation.observedAt}>
                {observation.observedAt}
              </time>
            </dd>
          </div>
          <div>
            <dt className="font-bold">Contract recorded</dt>
            <dd>
              <time dateTime={observation.contractRecordedAt}>
                {observation.contractRecordedAt}
              </time>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-ink-muted">
          Normalized immutable meaning, not original YAML. Recording time is
          metadata, not execution time; wall-clock correction can reverse
          apparent ordering.
        </p>
      </section>
      <Condition
        title="Declared applicability"
        condition={definition.applicability}
      />
      <section aria-label="Required evidence declarations">
        <h4 className="font-bold">Required evidence declarations</h4>
        <ol className="mt-2 list-inside list-decimal space-y-1 font-mono text-xs">
          {definition.requiredEvidence.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ol>
        <p className="mt-2 text-ink-muted">
          Not a fresh readiness assessment or an explanation of historical
          selection.
        </p>
      </section>
      <section aria-label="Declared contract steps">
        <h4 className="font-bold">Declared contract steps</h4>
        <p className="mt-2 text-ink-muted">
          Declaration order, not a DAG, scheduled work or performed actions. The
          current runtime pins one step.
        </p>
        <ol className="mt-3 space-y-3">
          {definition.steps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-md border border-border bg-canvas/60 p-3"
            >
              <h5 className="font-bold">
                {index + 1}. {step.id}
              </h5>
              <p className="font-mono text-xs">{step.capability}</p>
              <p className="mt-2">
                Declared risk: {step.risk} · Declared approval: {step.approval}
              </p>
              {step.id === observation.pinnedStepId ? (
                <div className="mt-3 rounded border border-highlight/60 bg-highlight/10 p-3">
                  <p className="font-bold text-highlight">Pinned by this run</p>
                  <p>
                    Run-effective risk: {run.effectiveRisk} · Required approval:{' '}
                    {run.requiredApproval}
                  </p>
                  <p className="mt-2 text-ink-muted">
                    Runtime safeguards can be stronger than these declarations.
                    Neither is an approval decision or capability grant.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-ink-muted">
                  Declared only; not the pinned runtime step.
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <Condition
        title="Declared outcome condition"
        condition={definition.outcomeProof}
      />
      <p className="rounded-md border border-border p-3 text-ink-muted">
        The outcome condition is not an assessment or accepted proof. Inspection
        does not validate registered references or tenant connector
        availability, and cannot authorize or execute any action.
      </p>
    </div>
  );
}

function Condition({
  title,
  condition,
}: {
  readonly title: string;
  readonly condition: ContractCondition;
}): ReactElement {
  return (
    <section aria-label={title}>
      <h4 className="font-bold">{title}</h4>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-ink-muted">Fact</dt>
          <dd className="font-mono text-xs">{condition.fact}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Equals · exact, case-sensitive</dt>
          <dd className="font-mono text-xs whitespace-pre-wrap">
            {condition.equals}
          </dd>
        </div>
      </dl>
    </section>
  );
}
