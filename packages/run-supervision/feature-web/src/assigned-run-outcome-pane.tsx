import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { AssignedRunEvidence } from './assigned-run-evidence';
import { AssignedRunVerification } from './assigned-run-verification';
import { formatRecordedAt, runStateLabels } from './run-supervision-copy';

export function AssignedRunOutcomePane({
  run,
}: {
  readonly run: AssignedRunConsole | undefined;
}): ReactElement {
  return (
    <section
      aria-labelledby="outcome-proof-heading"
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
        Outcome visibility
      </p>
      <h2
        id="outcome-proof-heading"
        className="mt-2 text-xl font-extrabold tracking-tight"
      >
        Outcome proof
      </h2>
      {run === undefined ? (
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          No private run state or proof is displayed without a successful
          current read.
        </p>
      ) : (
        <AssignedRunOutcomeRecords run={run} />
      )}
    </section>
  );
}

function AssignedRunOutcomeRecords({
  run,
}: {
  readonly run: AssignedRunConsole;
}): ReactElement {
  return (
    <>
      <div className="mt-5">
        <AssignedRunVerification run={run} />
      </div>
      <section
        aria-labelledby="run-state-heading"
        className="mt-4 rounded-md border border-border bg-canvas/60 p-4"
      >
        <h3 id="run-state-heading" className="font-bold">
          Recorded run state
        </h3>
        <dl className="mt-4 grid gap-4 text-sm">
          <AssignedRunFact label="State">
            {runStateLabels[run.state]}
          </AssignedRunFact>
          <AssignedRunFact label="State version">
            {run.stateVersion}
          </AssignedRunFact>
          <AssignedRunFact label="State recorded">
            <time dateTime={run.stateUpdatedAt}>
              {formatRecordedAt(run.stateUpdatedAt)}
            </time>
          </AssignedRunFact>
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
          <AssignedRunFact label="Case ID">{run.caseId}</AssignedRunFact>
          <AssignedRunFact label="Pinned evidence stream version">
            {run.caseEvidenceStreamVersion}
          </AssignedRunFact>
          <AssignedRunFact label="Assigned">
            <time dateTime={run.assignedAt}>
              {formatRecordedAt(run.assignedAt)}
            </time>
          </AssignedRunFact>
          <AssignedRunFact label="Predecessor run">
            {run.predecessorRunId ?? 'No predecessor recorded'}
          </AssignedRunFact>
        </dl>
        <p className="mt-4 text-xs leading-5 text-ink-muted">
          The pinned stream version identifies the run snapshot; it is not a
          count of verified facts. Evidence below includes only supported
          bindings and their linked sources.
        </p>
      </section>
      <div className="mt-4">
        <AssignedRunEvidence
          key={`${run.runId}:${run.caseEvidenceStreamVersion}`}
          evidence={run.pinnedEvidence}
        />
      </div>
    </>
  );
}
