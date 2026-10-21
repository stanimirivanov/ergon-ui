import type { AssignedRunConsole } from '@ergon/run-supervision-data-access-web';
import type { ReactElement, ReactNode, Ref } from 'react';

import { AssignedRunFact } from './assigned-run-fact';
import { AssignedRunVerification } from './assigned-run-verification';
import { formatRecordedAt, runStateLabels } from './run-supervision-copy';

export function AssignedRunOutcomePane({
  run,
  proofFinalizationControl,
  headingRef,
}: {
  readonly run: AssignedRunConsole | undefined;
  readonly proofFinalizationControl?: ReactNode;
  readonly headingRef?: Ref<HTMLHeadingElement>;
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
        ref={headingRef}
        tabIndex={-1}
        id="outcome-proof-heading"
        className="mt-2 scroll-mt-4 text-xl font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
      >
        Outcome proof
      </h2>
      {run === undefined ? (
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          No private run state or proof is displayed without a successful
          current read.
        </p>
      ) : (
        <AssignedRunOutcomeRecords
          run={run}
          proofFinalizationControl={proofFinalizationControl}
        />
      )}
    </section>
  );
}

function AssignedRunOutcomeRecords({
  run,
  proofFinalizationControl,
}: {
  readonly run: AssignedRunConsole;
  readonly proofFinalizationControl?: ReactNode;
}): ReactElement {
  return (
    <>
      <div className="mt-5">
        <AssignedRunVerification run={run} />
        <div className="mt-4">{proofFinalizationControl}</div>
      </div>
      <section
        aria-labelledby="run-state-heading"
        className="mt-4 rounded-md border border-border bg-canvas/60 p-4"
      >
        <h3 id="run-state-heading" className="font-bold">
          Recorded run state
        </h3>
        {run.state === 'CANCELLED' ? (
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            This untouched run ended before authorization or execution.
            Cancellation does not stop provider work, accept outcome proof or
            close the case.
          </p>
        ) : null}
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
    </>
  );
}
