import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import {
  evidenceApi,
  normalizeEvidenceFailure,
} from '@ergon/evidence-data-access-web';
import {
  validEvidenceId,
  validReviewRationale,
  type EvidenceQuery,
  type KnowledgeTarget,
  type ContradictionAssessment,
  type DocumentaryAdjudication,
} from '@ergon/evidence-model';
import { Failure } from './evidence-workspace';
import { BundleInspection, BundleForm } from './bundle-pane';
import {
  actionClass,
  KnowledgeOutcome,
  useDocumentaryWrite,
  useFormLifetime,
} from './knowledge-write';
interface Props {
  readonly query: EvidenceQuery;
  readonly view: 'contradictions' | 'bundles';
  readonly target: KnowledgeTarget | null;
  readonly signInHref: string;
  readonly onOpen: (target: KnowledgeTarget) => void;
  readonly onRecheck: () => void;
}
/** Host replaces the session/cache scope on every target and recheck. Forms/intent are mounted-only, quotes inert. */
export function EvidenceKnowledgeWorkspace(props: Props): ReactElement {
  if (props.target === null) return <KnowledgeLookup {...props} />;
  if (props.target.kind === 'bundle')
    return <BundleInspection {...props} id={props.target.id} />;
  if (props.target.kind === 'adjudication')
    return <AdjudicationPane {...props} id={props.target.id} />;
  return <AssessmentPane {...props} id={props.target.id} />;
}
function KnowledgeLookup(props: Props): ReactElement {
  const { register, handleSubmit } = useForm<{ id: string }>();
  const alive = useFormLifetime();
  return (
    <div className="space-y-6">
      <p>
        Use an exact supplied identifier. No catalog or automatic winner
        selection is available.
      </p>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(({ id }) => {
          if (alive.current)
            props.onOpen({
              kind: props.view === 'bundles' ? 'bundle' : 'assessment',
              id,
            });
        })}
      >
        <label className="block">
          {props.view === 'bundles' ? 'Bundle ID' : 'Accepted anchor claim ID'}
          <input
            className="block w-full rounded border p-2"
            required
            pattern="[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"
            {...register('id', { validate: validEvidenceId })}
          />
        </label>
        <button className={actionClass}>
          Inspect exact {props.view === 'bundles' ? 'bundle' : 'claim set'}
        </button>
      </form>
      {props.view === 'contradictions' ? (
        <AdjudicationLookup onOpen={props.onOpen} />
      ) : (
        <ProcedurePublication {...props} />
      )}
    </div>
  );
}
function AdjudicationLookup({
  onOpen,
}: {
  readonly onOpen: Props['onOpen'];
}): ReactElement {
  const { register, handleSubmit } = useForm<{ id: string }>();
  const alive = useFormLifetime();
  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(({ id }) => {
        if (alive.current) onOpen({ kind: 'adjudication', id });
      })}
    >
      <label className="block">
        Adjudication ID
        <input
          className="block w-full rounded border p-2"
          required
          pattern="[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"
          {...register('id', { validate: validEvidenceId })}
        />
      </label>
      <button className={actionClass}>Inspect exact adjudication</button>
    </form>
  );
}
function ProcedurePublication(props: Props): ReactElement {
  const write = useDocumentaryWrite(props.onOpen);
  return write.phase.kind !== 'idle' ? (
    <KnowledgeOutcome
      write={write}
      onRecheck={props.onRecheck}
      signInHref={props.signInHref}
    />
  ) : (
    <BundleForm
      query={props.query}
      onPublish={(command) => void write.perform({ kind: 'bundle', command })}
    />
  );
}
function AssessmentPane(props: Props & { readonly id: string }): ReactElement {
  const write = useDocumentaryWrite(props.onOpen);
  const read = evidenceApi.useAssessmentQuery(
    { ...props.query, id: props.id },
    { skip: write.phase.kind !== 'idle', refetchOnMountOrArgChange: true },
  );
  if (write.phase.kind !== 'idle')
    return (
      <KnowledgeOutcome
        write={write}
        onRecheck={props.onRecheck}
        signInHref={props.signInHref}
      />
    );
  if (read.isError)
    return (
      <Failure
        error={normalizeEvidenceFailure(read.error)}
        signInHref={props.signInHref}
      />
    );
  if (read.isFetching || read.currentData === undefined)
    return <p role="status">Checking complete current claim set…</p>;
  return (
    <div className="space-y-6">
      <AssessmentView data={read.currentData} />
      <AdjudicationLookup onOpen={props.onOpen} />
      {read.currentData.findings.some(
        (f) => f.comparison === 'CONFLICT' || f.comparison === 'UNDETERMINED',
      ) && (
        <AdjudicationForm
          data={read.currentData}
          onSubmit={(choice, selectedClaimId, rationale) =>
            void write.perform({
              kind: 'adjudication',
              command: {
                ...props.query,
                id: crypto.randomUUID(),
                anchorId: props.id,
                expectedRevision: read.currentData?.revision ?? 0,
                candidateIds:
                  read.currentData?.candidates.map((c) => c.id) ?? [],
                choice,
                selectedClaimId,
                rationale,
              },
            })
          }
        />
      )}
      <BundleForm
        query={props.query}
        assessment={read.currentData}
        anchorId={props.id}
        onPublish={(command) => void write.perform({ kind: 'bundle', command })}
      />
    </div>
  );
}
function AdjudicationPane(
  props: Props & { readonly id: string },
): ReactElement {
  const write = useDocumentaryWrite(props.onOpen);
  const read = evidenceApi.useAdjudicationQuery(
    { ...props.query, id: props.id },
    { skip: write.phase.kind !== 'idle', refetchOnMountOrArgChange: true },
  );
  if (write.phase.kind !== 'idle')
    return (
      <KnowledgeOutcome
        write={write}
        onRecheck={props.onRecheck}
        signInHref={props.signInHref}
      />
    );
  if (read.isError)
    return (
      <Failure
        error={normalizeEvidenceFailure(read.error)}
        signInHref={props.signInHref}
      />
    );
  if (read.isFetching || read.currentData === undefined)
    return <p role="status">Checking exact adjudication and current access…</p>;
  const data = read.currentData;
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Recorded adjudication: {data.choice}
        </h2>
        <p>
          {data.current
            ? 'Current candidate-set revision'
            : 'Historical decision — candidate set has changed'}
        </p>
        <p className="break-all">
          Adjudication {data.id} · Reviewer {data.reviewerId} ·{' '}
          {data.adjudicatedAt}
        </p>
        <blockquote className="whitespace-pre-wrap break-words">
          {data.rationale}
        </blockquote>
        <p className="break-all">
          Preferred claim: {data.selectedClaimId ?? 'None (deferred)'}
        </p>
        <button
          className={actionClass}
          onClick={() =>
            props.onOpen({ kind: 'assessment', id: data.anchorId })
          }
        >
          Assess current claim set
        </button>
      </section>
      <AssessmentView data={data.assessment} />
      {data.current && (
        <BundleForm
          query={props.query}
          assessment={data.assessment}
          anchorId={data.anchorId}
          adjudication={data}
          onPublish={(command) =>
            void write.perform({ kind: 'bundle', command })
          }
        />
      )}
    </div>
  );
}
export function AssessmentView({
  data,
}: {
  readonly data: ContradictionAssessment;
}): ReactElement {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Claim-set assessment: {data.state}</h2>
      <p className="break-words">
        {data.property} · {data.subject} / {data.scope} · Revision{' '}
        {data.revision} · {data.algorithm}
      </p>
      <p>
        No detected conflict is not proof of consistency. Unknown validity and
        undetermined comparisons cannot qualify a bundle. Preference grants no
        execution authority.
      </p>
      <div
        className="grid min-w-0 gap-4 md:grid-cols-2"
        aria-label="Cited accepted alternatives"
      >
        {data.candidates.map((c) => (
          <article
            key={c.id}
            className="min-w-0 space-y-3 rounded-lg border border-border p-4"
          >
            <h3 className="break-all font-bold">Accepted claim {c.id}</h3>
            <p>
              Value:{' '}
              {c.claim.input.booleanValue === null
                ? c.claim.input.textValue
                : String(c.claim.input.booleanValue)}
            </p>
            <p className="break-all">
              Validity:{' '}
              {c.claim.input.validFrom === null
                ? 'Unknown validity'
                : `${c.claim.input.validFrom} to ${c.claim.input.validUntil} (end excluded)`}
            </p>
            <p className="break-all text-sm">
              Source {c.sourceId} / SHA-256 {c.digest}
            </p>
            <p className="break-all text-sm">
              Extraction {c.claim.input.extractionId} /{' '}
              {c.claim.compilerRevision} · Accepted review {c.reviewCommandId}
            </p>
            <p className="break-all text-sm">
              Proposed by {c.claim.proposedBy} · {c.claim.recordedAt} · Code
              points [{c.claim.start}, {c.claim.endExclusive})
            </p>
            <pre className="max-w-full whitespace-pre-wrap break-all rounded bg-surface p-3 text-sm">
              {c.claim.quote}
            </pre>
          </article>
        ))}
      </div>
      <h3 className="font-bold">Complete pair findings</h3>
      {data.findings.length === 0 ? (
        <p>Insufficient candidates for a pair comparison.</p>
      ) : (
        <ul className="space-y-2">
          {data.findings.map((f) => (
            <li key={f.left + f.right} className="break-all">
              {f.left} / {f.right}: {f.comparison}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function AdjudicationForm({
  data,
  onSubmit,
}: {
  readonly data: ContradictionAssessment;
  readonly onSubmit: (
    choice: DocumentaryAdjudication['choice'],
    selected: string | null,
    rationale: string,
  ) => void;
}): ReactElement {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    choice: DocumentaryAdjudication['choice'];
    selected: string;
    rationale: string;
  }>({ defaultValues: { choice: 'DEFER', selected: '', rationale: '' } });
  const alive = useFormLifetime();
  const choice = watch('choice');
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((v) => {
        if (alive.current)
          onSubmit(
            v.choice,
            v.choice === 'DEFER' ? null : v.selected,
            v.rationale,
          );
      })}
    >
      <h2 className="text-xl font-bold">Record exact adjudication</h2>
      <p>
        One immutable decision per candidate-set revision. Preference does not
        remove unknown validity or undetermined findings.
      </p>
      <label className="block">
        Adjudication choice
        <select className="block w-full border p-2" {...register('choice')}>
          <option value="DEFER">Defer</option>
          <option value="PREFER_CLAIM">Prefer an exact claim</option>
        </select>
      </label>
      {choice === 'PREFER_CLAIM' && (
        <label className="block">
          Preferred claim
          <select
            className="block w-full border p-2"
            aria-invalid={errors.selected !== undefined}
            aria-describedby={
              errors.selected ? 'adjudication-form-error' : undefined
            }
            {...register('selected', {
              validate: (v) =>
                watch('choice') === 'DEFER' ||
                data.candidates.some((c) => c.id === v),
            })}
          >
            <option value="">Choose explicitly</option>
            {data.candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        Adjudication rationale
        <textarea
          className="block min-h-28 w-full rounded border p-2"
          maxLength={2000}
          aria-invalid={errors.rationale !== undefined}
          aria-describedby={
            errors.rationale ? 'adjudication-form-error' : undefined
          }
          {...register('rationale', { validate: validReviewRationale })}
        />
      </label>
      {(errors.selected || errors.rationale) && (
        <p id="adjudication-form-error" role="alert">
          Select a claim when preferring and enter a nonblank rationale without
          surrounding whitespace (maximum 2000 characters).
        </p>
      )}
      <button className={actionClass}>Confirm adjudication</button>
    </form>
  );
}
