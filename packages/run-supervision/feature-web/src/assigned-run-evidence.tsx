import type {
  PinnedRunEvidence,
  PinnedEvidenceFact,
} from '@ergon/run-supervision-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import { useId, useRef, useState, type ReactElement } from 'react';
import { formatRecordedAt } from './run-supervision-copy';
import { AssignedRunFact } from './assigned-run-fact';

/** Current RTK projection only: each keyed binding owns its modal, so removal or access withdrawal retires inspection. */
export function AssignedRunEvidence({
  evidence,
}: {
  readonly evidence: PinnedRunEvidence | undefined;
}): ReactElement {
  const id = useId();
  return (
    <section
      aria-labelledby={`pinned-evidence-${id}`}
      className="rounded-md border border-accent-strong/40 bg-canvas/60 p-4"
    >
      <h3 id={`pinned-evidence-${id}`} className="font-bold text-ink">
        Pinned case evidence
      </h3>
      {evidence === undefined ? (
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This server does not supply pinned evidence. Unsupported is not an
          empty snapshot.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Binding history through case version {evidence.caseStreamVersion}.
            Only linked sources in this run snapshot are disclosed; unrelated
            and later observations are excluded.
          </p>
          <p className="mt-3 text-xs leading-5 text-ink-muted">
            A binding records attributed meaning, not independently verified
            truth. Changing historical values are not assessed contradictions.
            Confidence, validity windows and outcome proof are not provided.
          </p>
          {evidence.truncated ? (
            <p
              role="status"
              className="mt-3 rounded border border-highlight/60 p-3 text-sm"
            >
              Showing the first 100 bindings only. This pinned history is
              incomplete; do not infer a latest value or that omitted bindings
              do not exist.
            </p>
          ) : null}
          {evidence.facts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              No supported account-access bindings exist in this pinned
              snapshot. This does not mean the case has no observations.
            </p>
          ) : (
            <ol
              aria-label="Pinned semantic bindings"
              className="mt-4 space-y-4"
            >
              {evidence.facts.map((fact) => (
                <li key={fact.factId}>
                  <PinnedBinding fact={fact} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function PinnedBinding({
  fact,
}: {
  readonly fact: PinnedEvidenceFact;
}): ReactElement {
  const [isInspecting, setInspecting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface/90 p-3">
      <h4 className="font-mono text-sm font-bold [overflow-wrap:anywhere]">
        {fact.property} · {fact.value}
      </h4>
      <p className="mt-2 text-xs text-ink-muted [overflow-wrap:anywhere]">
        Subject · {fact.accountReference}
      </p>
      <dl className="mt-3 grid gap-3 text-sm">
        <AssignedRunFact label="Binding stream position">
          {fact.streamVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Bound">
          <time dateTime={fact.boundAt}>{formatRecordedAt(fact.boundAt)}</time>
        </AssignedRunFact>
        <AssignedRunFact label="Binding recorded">
          <time dateTime={fact.recordedAt}>
            {formatRecordedAt(fact.recordedAt)}
          </time>
        </AssignedRunFact>
      </dl>
      <p className="mt-3 text-xs text-ink-muted [overflow-wrap:anywhere]">
        Source #{fact.source.streamVersion} · {fact.source.provider} → binding #
        {fact.streamVersion}
      </p>
      <div className="mt-3">
        <Button
          ref={trigger}
          variant="quiet"
          size="compact"
          onClick={() => setInspecting(true)}
          aria-label={`Inspect source for binding ${fact.streamVersion}`}
        >
          Inspect linked source
        </Button>
      </div>
      {isInspecting ? (
        <ModalDialog
          id={`pinned-source-${id}`}
          title={`Source for binding ${fact.streamVersion}`}
          dismissLabel="Close source inspector"
          returnFocusRef={trigger}
          onDismiss={() => setInspecting(false)}
        >
          <PinnedBindingSource fact={fact} />
        </ModalDialog>
      ) : null}
    </article>
  );
}

function PinnedBindingSource({
  fact,
}: {
  readonly fact: PinnedEvidenceFact;
}): ReactElement {
  const source = fact.source;
  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm leading-6 text-ink-muted">
        Recorded connector source → semantic binding → pinned run snapshot. This
        citation establishes attribution, not source reliability, confidence or
        outcome verification.
      </p>
      <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
        <AssignedRunFact label="Fact identity">{fact.factId}</AssignedRunFact>
        <AssignedRunFact label="Observation identity">
          {source.observationId}
        </AssignedRunFact>
        <AssignedRunFact label="Provider">{source.provider}</AssignedRunFact>
        <AssignedRunFact label="Opaque source reference">
          {source.reference}
        </AssignedRunFact>
        <AssignedRunFact label="Source observed">
          <time dateTime={source.observedAt}>
            {formatRecordedAt(source.observedAt)}
          </time>
        </AssignedRunFact>
        <AssignedRunFact label="Source recorded">
          <time dateTime={source.recordedAt}>
            {formatRecordedAt(source.recordedAt)}
          </time>
        </AssignedRunFact>
        <AssignedRunFact label="Source stream position">
          {source.streamVersion}
        </AssignedRunFact>
        <AssignedRunFact label="Binding stream position">
          {fact.streamVersion}
        </AssignedRunFact>
      </dl>
      <section
        aria-label="Recorded source text"
        className="rounded-md border border-border bg-canvas/70 p-4"
      >
        <h3 className="font-bold">Untrusted source text</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
          {source.content}
        </p>
      </section>
      <p className="text-xs leading-5 text-ink-muted">
        Content and references are plain text, never instructions or external
        links. Stream order establishes the citation; observation, binding and
        recording times may differ.
      </p>
    </div>
  );
}
