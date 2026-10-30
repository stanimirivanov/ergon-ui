import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import {
  evidenceApi,
  normalizeEvidenceFailure,
} from '@ergon/evidence-data-access-web';
import {
  canonicalEvidenceIds,
  type BundleIntent,
  type ContradictionAssessment,
  type DocumentaryAdjudication,
  type EvidenceQuery,
} from '@ergon/evidence-model';
import { Failure } from './evidence-workspace';
import { actionClass, useFormLifetime } from './knowledge-write';

export function BundleForm({
  query,
  assessment,
  anchorId,
  adjudication,
  onPublish,
}: {
  readonly query: EvidenceQuery;
  readonly assessment?: ContradictionAssessment;
  readonly anchorId?: string;
  readonly adjudication?: DocumentaryAdjudication;
  readonly onPublish: (command: BundleIntent) => void;
}): ReactElement {
  const conflict = assessment?.state === 'CONFLICT';
  const preferred =
    adjudication?.current && adjudication.choice === 'PREFER_CLAIM'
      ? adjudication.selectedClaimId
      : null;
  const blocked =
    assessment !== undefined &&
    (assessment.hasUndetermined ||
      assessment.candidates.some((c) => c.claim.input.validFrom === null) ||
      (conflict && preferred === null));
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ claims: string[]; procedures: string }>({
    defaultValues: {
      claims: preferred === null ? [] : [preferred],
      procedures: '',
    },
  });
  const alive = useFormLifetime(),
    claims = watch('claims');
  if (blocked)
    return (
      <section>
        <h2 className="text-xl font-bold">Bundle publication unavailable</h2>
        <p>
          Known validity and determined findings are required. A conflicting set
          also needs its current preference adjudication; open that exact
          adjudication to publish. Deferred or historical decisions cannot
          qualify a conflicting selection.
        </p>
      </section>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((v) => {
        if (!alive.current) return;
        const selected = [...v.claims].sort(),
          procedures = procedureIds(v.procedures);
        onPublish({
          ...query,
          id: crypto.randomUUID(),
          claims: selected,
          procedures,
          claimSets:
            assessment !== undefined &&
            anchorId !== undefined &&
            selected.length > 0
              ? [
                  {
                    anchorId,
                    revision: assessment.revision,
                    candidateIds: assessment.candidates.map((c) => c.id),
                    adjudicationId: conflict
                      ? (adjudication?.id ?? null)
                      : null,
                  },
                ]
              : [],
        });
      })}
    >
      <h2 className="text-xl font-bold">Publish exact evidence bundle</h2>
      <p>
        Choose at most 20 accepted claims and procedures in total. All assessed
        alternatives are retained as context. Publication creates immutable
        documentary history, not operational truth or execution permission.
      </p>
      {assessment !== undefined && (
        <fieldset className="space-y-3">
          <legend className="font-bold">Selected claims</legend>
          {assessment.candidates
            .filter((c) => !conflict || c.id === preferred)
            .map((c) => (
              <label key={c.id} className="flex items-start gap-2 break-all">
                <input type="checkbox" value={c.id} {...register('claims')} />
                {c.id}
              </label>
            ))}
        </fieldset>
      )}
      <label className="block">
        Accepted procedure IDs (optional, one per line)
        <textarea
          className="block min-h-24 w-full rounded border p-2"
          aria-invalid={errors.procedures !== undefined}
          aria-describedby={
            errors.procedures ? 'bundle-selection-error' : undefined
          }
          {...register('procedures', {
            validate: (v) => {
              const ids = procedureIds(v);
              return (
                canonicalEvidenceIds(ids) &&
                ids.length + claims.length >= 1 &&
                ids.length + claims.length <= 20
              );
            },
          })}
        />
      </label>
      {errors.procedures && (
        <p id="bundle-selection-error" role="alert">
          Select at least one claim or enter accepted procedure IDs. IDs must be
          unique canonical UUIDs; select at most 20 proposals.
        </p>
      )}
      <p>
        One complete assessed claim set per bundle in this workbench.
        Procedure-only bundles need no claim assessment. The server rechecks
        acceptance, exact revisions and current authority atomically.
      </p>
      <button className={actionClass}>Confirm bundle publication</button>
    </form>
  );
}
function procedureIds(value: string): string[] {
  return value.split(/\s+/u).filter(Boolean).sort();
}
export function BundleInspection({
  query,
  id,
  signInHref,
}: {
  readonly query: EvidenceQuery;
  readonly id: string;
  readonly signInHref: string;
}): ReactElement {
  const read = evidenceApi.useBundleQuery(
    { ...query, id },
    { refetchOnMountOrArgChange: true },
  );
  if (read.isError)
    return (
      <Failure
        error={normalizeEvidenceFailure(read.error)}
        signInHref={signInHref}
      />
    );
  if (read.isFetching || read.currentData === undefined)
    return (
      <p role="status">Checking exact historical bundle and current access…</p>
    );
  const b = read.currentData,
    m = b.manifest;
  return (
    <section className="min-w-0 space-y-5">
      <h2 className="text-2xl font-bold">Historical evidence bundle</h2>
      <p>
        This immutable manifest records its original assessment cutoff. It is
        not requalified when read; later accepted evidence or decisions may
        differ.
      </p>
      <dl className="break-all">
        <dt>Bundle ID</dt>
        <dd>{b.id}</dd>
        <dt>SHA-256 (server-reported canonical manifest digest)</dt>
        <dd>{b.sha256}</dd>
        <dt>Published by / recorded at</dt>
        <dd>
          {b.publishedBy} / {b.recordedAt}
        </dd>
        <dt>Assessment cutoff</dt>
        <dd>{m.assessedAt}</dd>
        <dt>Manifest schema</dt>
        <dd>{m.schema}</dd>
      </dl>
      <h3 className="text-xl font-bold">Exact proposal references</h3>
      <ul className="space-y-3">
        {m.proposals.map((p) => (
          <li
            key={p.kind + p.id}
            className="break-all rounded border border-border p-3"
          >
            <p>
              {p.kind} {p.id} ·{' '}
              {p.selected ? 'Selected' : 'Assessed alternative (context)'}
            </p>
            <p>
              Source {p.sourceId} / {p.digest}
            </p>
            <p>
              Extraction {p.extractionId} / {p.compilerRevision}
            </p>
            <p>Accepted review {p.reviewCommandId}</p>
          </li>
        ))}
      </ul>
      <h3 className="text-xl font-bold">Pinned source revisions</h3>
      <ul>
        {m.sources.map((s) => (
          <li key={s.sourceId + s.digest} className="break-all">
            {s.sourceId} / {s.digest}
          </li>
        ))}
      </ul>
      <h3 className="text-xl font-bold">Recorded claim-set assessments</h3>
      {m.claimSets.length === 0 ? (
        <p>No documentary claims; procedure-only bundle.</p>
      ) : (
        <ul className="space-y-3">
          {m.claimSets.map((s) => (
            <li
              key={s.property + s.subject + s.scope}
              className="break-all rounded border border-border p-3"
            >
              <p>
                {s.property} · {s.subject} / {s.scope} · Revision {s.revision}
              </p>
              <p>Candidates: {s.candidateIds.join(', ')}</p>
              <p>Accepted review commands: {s.reviewCommandIds.join(', ')}</p>
              <p>
                Findings in canonical pair order:{' '}
                {s.findingCodes.join(', ') || 'No pairs'}
              </p>
              <p>Adjudication: {s.adjudicationId ?? 'None required'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
