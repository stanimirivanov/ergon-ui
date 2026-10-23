import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import type { ReactElement, Ref } from 'react';

import { AssignedRunEvidence } from './assigned-run-evidence';
import { AssignedRunFact } from './assigned-run-fact';
import { formatRecordedAt } from './run-supervision-copy';

/**
 * Presents pinned inputs separately from post-action verification and proof.
 * Composition supplies only the current gated run; no resource is retained.
 * Withdrawing that run unmounts all keyed binding/source inspectors while the
 * non-private navigation heading remains mounted.
 */
export function AssignedRunCaseEvidence({
  run,
  headingRef,
}: {
  readonly run: AssignedRunConsole | undefined;
  readonly headingRef?: Ref<HTMLHeadingElement>;
}): ReactElement {
  return (
    <section
      aria-labelledby="run-case-evidence-heading"
      className="min-w-0 rounded-md border border-border bg-surface/90 p-4"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-strong uppercase">
        Investigation inputs
      </p>
      <h2
        ref={headingRef}
        id="run-case-evidence-heading"
        tabIndex={-1}
        className="mt-2 scroll-mt-4 text-xl font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
      >
        Case evidence
      </h2>
      {run === undefined ? (
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          Case coordinates, pinned bindings and source inspection are withheld
          until a successful current run read. This is not an empty evidence
          snapshot.
        </p>
      ) : (
        <>
          <section
            aria-labelledby="run-case-context-heading"
            className="mt-4 border-y border-border py-4"
          >
            <h3 id="run-case-context-heading" className="font-bold">
              Case context
            </h3>
            <dl className="mt-3 grid gap-3 text-sm">
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
              count of verified facts. These bindings are run inputs, not
              post-action verification or accepted outcome proof.
            </p>
          </section>
          <div className="mt-5">
            <AssignedRunEvidence
              key={`${run.runId}:${run.caseEvidenceStreamVersion}`}
              evidence={run.pinnedEvidence}
            />
          </div>
        </>
      )}
    </section>
  );
}
