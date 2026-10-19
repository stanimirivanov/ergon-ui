import type { RunExecutionHistory } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

/** Render only committed admission facts, preserving server order without inventing attempt outcomes or causal sequencing. */
export function RunExecutionAdmissionRecords({
  history,
}: {
  readonly history: RunExecutionHistory;
}): ReactElement {
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm leading-6 text-ink-muted">
        Access observed at{' '}
        <time dateTime={history.observedAt} className="wrap-anywhere">
          {history.observedAt}
        </time>
        {' · '}Current supervision epoch {history.supervisionRevision}. This is
        an authorization observation, not a live execution clock.
      </p>
      {!history.commandRecorded ? (
        <p role="status" className="rounded-md border border-border p-4">
          No browser execution command recorded. This does not exclude internal
          execution or external effects.
        </p>
      ) : (
        <>
          <p className="text-sm leading-6 text-ink-muted">
            Recording order only; timestamp ties use a private server
            tie-breaker. Admission times can move backwards. INITIAL need not
            appear first. These checkpoints prove admission, not provider start,
            completion, or exactly-once execution. Recovery may repair a
            projection without any provider call.
          </p>
          {history.truncated ? (
            <p
              role="status"
              className="rounded-md border border-highlight/60 bg-highlight/5 p-3 text-sm leading-6"
            >
              Truncated history: 100 admissions shown. More records exist; no
              total or stable prefix is promised. The initial admission may be
              outside this view.
            </p>
          ) : null}
          <ul aria-label="Recorded admission checkpoints" className="space-y-3">
            {history.entries.map((entry, index) => (
              // No public admission identity exists. Rows are immutable presentation
              // only; position is a render key, never an attempt number or authority.
              <li
                key={index}
                className="rounded-md border border-border bg-canvas/50 p-4"
              >
                <h4 className="font-bold">
                  {entry.kind === 'INITIAL'
                    ? 'Initial admission'
                    : 'Recovery admission'}
                </h4>
                <dl className="mt-3 grid min-w-0 gap-3 text-sm">
                  <div>
                    <dt className="text-ink-muted">
                      Supervision epoch at admission
                    </dt>
                    <dd>{entry.supervisionRevision}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Admitted at</dt>
                    <dd className="wrap-anywhere">
                      <time dateTime={entry.admittedAt}>
                        {entry.admittedAt}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Recorded at</dt>
                    <dd className="wrap-anywhere">
                      <time dateTime={entry.recordedAt}>
                        {entry.recordedAt}
                      </time>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm leading-6 text-ink-muted">
        Read-only history grants no execution, acknowledgement or recovery
        authority. The run receipt and outcome proof remain separate; no result,
        duration, cost or provider-call count is attributed to these rows.
      </p>
    </div>
  );
}
