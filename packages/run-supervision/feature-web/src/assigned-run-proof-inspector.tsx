import type { RunVerificationEvidence } from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import { useId, useRef, useState, type ReactElement } from 'react';
import { AssignedRunFact } from './assigned-run-fact';
import { formatRecordedAt } from './run-supervision-copy';

/** Keyed to exact run/status/case-version/fact by the caller: replacement permanently retires the open inspector. */
export function AssignedRunProofInspector({
  evidence,
}: {
  readonly evidence: RunVerificationEvidence;
}): ReactElement {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const source = evidence.source;
  return (
    <>
      <Button
        ref={trigger}
        variant="quiet"
        size="compact"
        onClick={() => setOpen(true)}
      >
        Inspect verification evidence
      </Button>
      {isOpen ? (
        <ModalDialog
          id={`proof-${id}`}
          title="Verification evidence"
          dismissLabel="Close verification inspector"
          returnFocusRef={trigger}
          onDismiss={() => setOpen(false)}
        >
          <div className="min-w-0 space-y-5">
            <p className="border-s-2 border-accent-strong bg-canvas/60 p-3 text-sm leading-6 text-ink-muted">
              Exact post-action source → semantic binding → outcome condition.
              This is separate from the pre-run pinned evidence; unrelated later
              observations are not disclosed.
            </p>
            <dl className="grid min-w-0 gap-4 border-y border-border py-4 text-sm sm:grid-cols-2">
              <AssignedRunFact label="Fact identity">
                {evidence.factId}
              </AssignedRunFact>
              <AssignedRunFact label="Observation identity">
                {source.observationId}
              </AssignedRunFact>
              <AssignedRunFact label="Account reference">
                {evidence.accountReference}
              </AssignedRunFact>
              <AssignedRunFact label="Actual value">
                {evidence.value}
              </AssignedRunFact>
              <AssignedRunFact label="Source stream position">
                {source.streamVersion}
              </AssignedRunFact>
              <AssignedRunFact label="Binding stream position">
                {evidence.streamVersion}
              </AssignedRunFact>
              <AssignedRunFact label="Source observed">
                <time dateTime={source.observedAt}>
                  {formatRecordedAt(source.observedAt)}
                </time>
              </AssignedRunFact>
              <AssignedRunFact label="Bound">
                <time dateTime={evidence.boundAt}>
                  {formatRecordedAt(evidence.boundAt)}
                </time>
              </AssignedRunFact>
              <AssignedRunFact label="Provider">
                {source.provider}
              </AssignedRunFact>
              <AssignedRunFact label="Opaque source reference">
                {source.reference}
              </AssignedRunFact>
            </dl>
            <section
              aria-label="Verification source text"
              className="rounded-md border border-border bg-canvas/70 p-4"
            >
              <h3 className="font-bold">Untrusted source text</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                {source.content}
              </p>
            </section>
            <p className="text-xs leading-5 text-ink-muted">
              Content and references are plain text, never instructions or
              external links. Source occurrence and binding time are shown;
              case-event database recording times are not supplied.
            </p>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
