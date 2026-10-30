import { useEffect, useRef, useState, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import {
  evidenceApi,
  normalizeEvidenceFailure,
  type EvidenceFailure,
} from '@ergon/evidence-data-access-web';
import {
  validReviewRationale,
  type EvidenceCursor,
  type EvidenceInspection,
  type EvidenceQuery,
  type EvidenceReviewIntent,
  type EvidenceSelection,
  type PendingEvidence,
  type ReviewDecision,
} from '@ergon/evidence-model';

interface Props {
  readonly query: EvidenceQuery;
  readonly selection: PendingEvidence | null;
  readonly cursor: EvidenceCursor | null;
  readonly signInHref: string;
  readonly onOpen: (proposal: PendingEvidence) => void;
  readonly onPage: (cursor: EvidenceCursor) => void;
  readonly onRecheck: () => void;
}
const button =
  'rounded-md border border-border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4';
/** Remote state stays in RTK; only form/selection/immutable uncertain intent lives locally. Host owns retirement and focus. */
export function EvidenceWorkspace(props: Props): ReactElement {
  return props.selection === null ? (
    <EvidenceQueue {...props} />
  ) : (
    <EvidenceReviewPane
      query={{ ...props.query, proposal: props.selection }}
      onRecheck={props.onRecheck}
      signInHref={props.signInHref}
    />
  );
}
function EvidenceQueue(props: Props): ReactElement {
  const read = evidenceApi.usePendingQuery(
    { ...props.query, cursor: props.cursor },
    { refetchOnMountOrArgChange: true },
  );
  if (read.isError)
    return (
      <Failure
        error={normalizeEvidenceFailure(read.error)}
        signInHref={props.signInHref}
      />
    );
  if (read.isFetching || read.currentData === undefined)
    return <p role="status">Checking the pending evidence queue…</p>;
  return (
    <div className="space-y-5">
      <p>
        Documentary proposals require human review. Acceptance does not prove
        operational truth or authorize execution.
      </p>
      {read.currentData.entries.length === 0 ? (
        <p>No pending proposals on this page.</p>
      ) : (
        <ul className="space-y-4" aria-label="Pending documentary proposals">
          {read.currentData.entries.map((entry) => (
            <li
              key={entry.kind + entry.id}
              className="rounded-lg border border-border p-4"
            >
              <h2 className="break-words text-lg font-bold">{entry.label}</h2>
              <p>{entry.kind === 'CLAIM' ? 'Claim' : 'Procedure'} · Proposed</p>
              <p className="break-all text-sm">
                Source {entry.sourceId} · {entry.compilerRevision}
              </p>
              <button
                type="button"
                className={button}
                onClick={() => props.onOpen(entry)}
              >
                Inspect {entry.kind === 'CLAIM' ? 'claim' : 'procedure'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {read.currentData.next !== null && (
        <button
          type="button"
          className={button}
          onClick={() => {
            if (
              read.currentData?.next !== null &&
              read.currentData?.next !== undefined
            )
              props.onPage(read.currentData.next);
          }}
        >
          Next page
        </button>
      )}
    </div>
  );
}
type ReviewPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'writing'; readonly intent: EvidenceReviewIntent }
  | { readonly kind: 'uncertain'; readonly intent: EvidenceReviewIntent }
  | { readonly kind: 'failed'; readonly error: EvidenceFailure };
function EvidenceReviewPane({
  query,
  onRecheck,
  signInHref,
}: {
  readonly query: EvidenceSelection;
  readonly onRecheck: () => void;
  readonly signInHref: string;
}): ReactElement {
  const [phase, setPhase] = useState<ReviewPhase>({ kind: 'idle' });
  const read = evidenceApi.useInspectionQuery(query, {
    skip: phase.kind !== 'idle',
    refetchOnMountOrArgChange: true,
  });
  const [review] = evidenceApi.useReviewMutation();
  const alive = useRef(false);
  const pending = useRef<{ abort(): void } | null>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.abort();
    };
  }, []);
  async function perform(intent: EvidenceReviewIntent): Promise<void> {
    // Commit withdrawal before acquiring CSRF or issuing a mutation. No resource snapshot is retained.
    flushSync(() => setPhase({ kind: 'writing', intent }));
    outcomeHeading.current?.focus();
    const request = review(intent);
    pending.current = request;
    const result = await request;
    if (!alive.current) return;
    pending.current = null;
    if ('data' in result) {
      onRecheck();
      return;
    }
    const error = normalizeEvidenceFailure(result.error);
    setPhase(
      [
        'transport',
        'timeout',
        'invalid-response',
        'unavailable',
        'request-cancelled',
        'unexpected-defect',
      ].includes(error.kind)
        ? { kind: 'uncertain', intent }
        : { kind: 'failed', error },
    );
    outcomeHeading.current?.focus();
  }
  if (phase.kind !== 'idle')
    return (
      <section className="space-y-4">
        <h2 ref={outcomeHeading} tabIndex={-1} className="text-xl font-bold">
          Review result
        </h2>
        {phase.kind === 'writing' ? (
          <p role="status">Recording the exact review…</p>
        ) : phase.kind === 'uncertain' ? (
          <>
            <p role="alert">
              The result is uncertain. A review may already have been recorded.
              Retry only this exact decision, or recheck current access.
            </p>
            <p>Decision: {phase.intent.decision}</p>
            <blockquote className="whitespace-pre-wrap break-words">
              {phase.intent.rationale}
            </blockquote>
            <button
              type="button"
              className={button}
              onClick={() => void perform(phase.intent)}
            >
              Retry exact review
            </button>
          </>
        ) : (
          <Failure error={phase.error} signInHref={signInHref} />
        )}
        {phase.kind !== 'writing' && (
          <button type="button" className={button} onClick={onRecheck}>
            Recheck current review
          </button>
        )}
      </section>
    );
  if (read.isError)
    return (
      <Failure
        error={normalizeEvidenceFailure(read.error)}
        signInHref={signInHref}
      />
    );
  if (read.isFetching || read.currentData === undefined)
    return <p role="status">Checking current review access…</p>;
  const data = read.currentData;
  return (
    <section className="space-y-6">
      <ProposalInspection data={data} query={query} />
      {data.status === 'PROPOSED' && data.version === 0 ? (
        <ReviewForm
          onSubmit={(decision, rationale) =>
            void perform({
              ...query,
              commandId: crypto.randomUUID(),
              extractionId: query.proposal.extractionId,
              expectedVersion: 0,
              decision,
              rationale,
            })
          }
        />
      ) : (
        <div>
          <h2 className="font-bold">Recorded decision: {data.status}</h2>
          <p>No further review is permitted for this proposal.</p>
          <blockquote className="whitespace-pre-wrap break-words">
            {data.review?.rationale}
          </blockquote>
          <p className="break-all">
            Reviewer: {data.review?.reviewerId} · {data.review?.reviewedAt}
          </p>
        </div>
      )}
    </section>
  );
}
function ReviewForm({
  onSubmit,
}: {
  readonly onSubmit: (decision: ReviewDecision, rationale: string) => void;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ rationale: string; decision: ReviewDecision }>({
    defaultValues: { rationale: '', decision: 'ACCEPTED' },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((value) =>
        onSubmit(value.decision, value.rationale),
      )}
    >
      <h2 className="text-xl font-bold">Record a terminal review</h2>
      <p>
        This decision cannot be edited. Self-review is permitted. It grants no
        execution authority.
      </p>
      <label className="block">
        Decision{' '}
        <select
          className="block w-full max-w-full border p-2"
          {...register('decision')}
        >
          <option value="ACCEPTED">Accept documentary proposal</option>
          <option value="REJECTED">Reject documentary proposal</option>
        </select>
      </label>
      <label className="block">
        Rationale{' '}
        <textarea
          className="block min-h-28 w-full rounded border p-2"
          maxLength={2000}
          aria-invalid={errors.rationale !== undefined}
          aria-describedby={
            errors.rationale ? 'evidence-rationale-error' : undefined
          }
          {...register('rationale', {
            validate: (v) =>
              validReviewRationale(v) ||
              'Enter a nonblank rationale without surrounding whitespace or unsupported control characters (maximum 2000 characters).',
          })}
        />
      </label>
      {errors.rationale && (
        <p id="evidence-rationale-error" role="alert">
          {errors.rationale.message}
        </p>
      )}
      <button className={button} type="submit">
        Confirm review
      </button>
    </form>
  );
}
function Quote({
  quote,
  label,
}: {
  readonly quote: string;
  readonly label: string;
}): ReactElement {
  return (
    <div>
      <h3 className="font-bold">{label}</h3>
      <pre className="max-w-full whitespace-pre-wrap break-all rounded bg-surface p-3 text-sm">
        {quote}
      </pre>
    </div>
  );
}
function ProposalInspection({
  data,
  query,
}: {
  readonly data: EvidenceInspection;
  readonly query: EvidenceSelection;
}): ReactElement {
  const claim = data.claim;
  const procedure = data.procedure;
  return (
    <div className="min-w-0 space-y-4">
      <h2 className="break-words text-2xl font-bold">
        {procedure?.title ?? 'Documentary claim'}
      </h2>
      <p>
        Status: {data.status} · Review version {data.version}
      </p>
      <dl className="break-all text-sm">
        <dt>Source revision</dt>
        <dd>
          {query.proposal.sourceId} / SHA-256 {query.proposal.digest}
        </dd>
        <dt>Extraction / compiler</dt>
        <dd>
          {query.proposal.extractionId} / {query.proposal.compilerRevision}
        </dd>
        <dt>Proposed by / recorded at</dt>
        <dd>
          {query.proposal.proposedBy} / {query.proposal.recordedAt}
        </dd>
      </dl>
      {claim !== null && (
        <>
          <dl className="break-words">
            <dt>Property</dt>
            <dd>{claim.input.property}</dd>
            <dt>Value</dt>
            <dd>
              {claim.input.booleanValue === null
                ? claim.input.textValue
                : String(claim.input.booleanValue)}
            </dd>
            <dt>Subject / scope</dt>
            <dd>
              {claim.input.subject} / {claim.input.scope}
            </dd>
            <dt>Validity</dt>
            <dd>
              {claim.input.validFrom === null
                ? 'Unknown validity'
                : `${claim.input.validFrom} to ${claim.input.validUntil} (end excluded)`}
            </dd>
          </dl>
          <Quote
            label={`Exact source quotation [${claim.start}, ${claim.endExclusive})`}
            quote={claim.quote}
          />
        </>
      )}
      {procedure !== null && (
        <>
          <Quote
            label="Exact ordered-list quotation"
            quote={procedure.citation.quote}
          />
          <ol className="space-y-4">
            {procedure.steps.map((step) => (
              <li key={step.position}>
                <Quote
                  label={`Step ${step.position}`}
                  quote={step.citation.quote}
                />
                {step.operation !== null ? (
                  <div className="break-all">
                    <p>
                      Documented API operation: {step.operation.jsonPointer}
                    </p>
                    <p>
                      Source {step.operation.citation.sourceId} /{' '}
                      {step.operation.citation.digest}
                    </p>
                    <p>
                      Extraction {step.operation.extractionId} /{' '}
                      {step.operation.compilerRevision}
                    </p>
                    <Quote
                      label="Exact API quotation (not an invocation)"
                      quote={step.operation.citation.quote}
                    />
                  </div>
                ) : (
                  <p>No API operation linked.</p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
export function Failure({
  error,
  signInHref,
}: {
  readonly error: EvidenceFailure;
  readonly signInHref: string;
}): ReactElement {
  return (
    <div role="alert">
      <p>
        {error.kind === 'conflict'
          ? 'The evidence changed or this command conflicts. Recheck before making a new decision.'
          : error.kind === 'authentication-required'
            ? 'Sign in again to inspect evidence.'
            : error.kind === 'denied'
              ? 'Evidence is not currently available to this session.'
              : error.kind === 'unsupported'
                ? 'This server does not support the evidence review contract.'
                : 'Evidence could not be verified. Recheck current access.'}
      </p>
      {error.kind === 'authentication-required' && (
        <a className="underline" href={signInHref}>
          Sign in
        </a>
      )}
    </div>
  );
}
