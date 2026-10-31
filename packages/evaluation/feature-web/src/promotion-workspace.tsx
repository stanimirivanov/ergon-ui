import { flushSync } from 'react-dom';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@ergon/ui-web';
import {
  promotionApi,
  parsePromotionEvidence,
  normalizePromotionFailure,
} from '@ergon/evaluation-data-access-web';
import type {
  EvaluationQuery,
  PromotionCommand,
  PromotionIntent,
} from '@ergon/evaluation-model';
function Coordinates({
  intent,
}: {
  readonly intent: PromotionIntent;
}): ReactElement {
  return (
    <div className="min-w-0 space-y-4">
      <h2 className="text-2xl font-bold">Exact promotion review</h2>
      {(['contract', 'suite', 'policy'] as const).map((key) => (
        <div key={key}>
          <h3 className="font-bold capitalize">{key}</h3>
          <p className="break-all">
            {intent[key].key} / {intent[key].revision}
          </p>
          <p className="break-all font-mono text-xs">
            SHA-256 {intent[key].sha256}
          </p>
        </div>
      ))}
      <p>Required-suite binding version: {intent.expectedVersion}</p>
      <p className="break-words">Rationale: {intent.rationale}</p>
      <h3 className="font-bold">Selected report evidence</h3>
      <ul className="space-y-3">
        {intent.reports.map((r) => (
          <li key={r.reportId} className="break-all text-sm">
            Fixture {r.fixture.key} / {r.fixture.revision}
            <br />
            Fixture SHA-256 {r.fixture.sha256}
            <br />
            Report {r.reportId}
            <br />
            Report SHA-256 {r.reportDigest}
          </li>
        ))}
      </ul>
    </div>
  );
}
/** Mounted confirmed intent only. Host cancellation must unmount and retire this private store. No background or automatic retries. */
export function PromotionWorkspace({
  query,
  onCancel,
  signInHref,
}: {
  readonly query: EvaluationQuery;
  readonly onCancel: () => void;
  readonly signInHref: string;
}): ReactElement {
  const form = useForm<{
    contractKey: string;
    reports: string;
    rationale: string;
  }>({ defaultValues: { contractKey: '', reports: '[]', rationale: '' } });
  const [review, reviewState] = promotionApi.useReviewMutation();
  const [confirm, confirmation] = promotionApi.useConfirmMutation();
  const [ack, setAck] = useState(false);
  const [command, setCommand] = useState<PromotionCommand | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const busy = useRef(false),
    mounted = useRef(false);
  const handle = useRef<{ abort: () => void } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      handle.current?.abort();
    };
  }, []);
  const failure = reviewState.error ?? confirmation.error;
  const kind = normalizePromotionFailure(failure).kind;
  const uncertain =
    command !== null &&
    confirmation.isError &&
    [
      'transport',
      'timeout',
      'unavailable',
      'invalid-response',
      'unexpected-defect',
    ].includes(kind);
  async function submit(): Promise<void> {
    if (busy.current || !mounted.current) return;
    const values = form.getValues();
    const reports = parsePromotionEvidence(values.reports);
    if (reports === undefined) {
      form.setError('reports', {
        message:
          'Enter a JSON array of exact fixture, reportId and reportDigest references.',
      });
      return;
    }
    busy.current = true;
    flushSync(() => {
      setWithdrawing(true);
      form.reset();
    });
    try {
      const request = review({
        ...query,
        contractKey: values.contractKey,
        reports,
        rationale: values.rationale,
      });
      handle.current = request;
      await request;
    } finally {
      busy.current = false;
      if (mounted.current) setWithdrawing(false);
    }
  }
  async function send(replay = false): Promise<void> {
    if (busy.current || !mounted.current) return;
    const current = reviewState.data;
    if (!replay && (!ack || !current?.eligibility.eligible || command !== null))
      return;
    if (replay && (!uncertain || command === null)) return;
    const intent = command ?? {
      ...query,
      commandId: crypto.randomUUID(),
      intent: structuredClone(current!.intent),
    };
    busy.current = true;
    flushSync(() => {
      setWithdrawing(true);
      setCommand(intent);
      reviewState.reset();
      setAck(false);
    });
    try {
      const request = confirm(intent);
      handle.current = request;
      const result = await request;
      if (
        mounted.current &&
        ('data' in result ||
          ![
            'transport',
            'timeout',
            'unavailable',
            'invalid-response',
            'unexpected-defect',
          ].includes(normalizePromotionFailure(result.error).kind))
      )
        setCommand(null);
    } finally {
      busy.current = false;
      if (mounted.current) setWithdrawing(false);
    }
  }
  return (
    <section aria-label="Contract promotion" className="min-w-0 space-y-5">
      <p>
        Review is advisory. Confirmation rechecks evaluation viewer and contract
        promoter authority, evidence and the current suite binding. Promotion
        can admit this exact revision for future runs in enforced tenants.
      </p>
      <Button type="button" variant="quiet" onClick={onCancel}>
        Cancel and return to evaluations
      </Button>
      {withdrawing || reviewState.isLoading || confirmation.isLoading ? (
        <p role="status">Checking promotion…</p>
      ) : confirmation.data ? (
        <div role="status" className="space-y-3">
          <h2 className="text-2xl font-bold">Promotion recorded</h2>
          <p className="break-all">Command {confirmation.data.commandId}</p>
          <p className="break-all">
            Contract {confirmation.data.contract.key} /{' '}
            {confirmation.data.contract.revision}
          </p>
          <p>Binding version {confirmation.data.bindingVersion}</p>
          <p>Original promotion time {confirmation.data.promotedAt}</p>
          <p>
            {confirmation.data.created
              ? 'New command recorded.'
              : 'Original command recovered.'}{' '}
            This acknowledgement is historical.
          </p>
        </div>
      ) : failure !== undefined ? (
        <div role="alert" className="space-y-3">
          <p>
            {kind === 'conflict'
              ? 'The review is stale or the gate is no longer eligible. Cancel and review again.'
              : kind === 'denied'
                ? 'Current evaluation or promotion authority is unavailable. Cancel and recheck access.'
                : kind === 'authentication-required'
                  ? 'Your session must be renewed.'
                  : uncertain
                    ? 'The promotion outcome is uncertain. Replay only the original command to recover its acknowledgement.'
                    : 'Promotion could not be checked. Cancel and review again.'}
          </p>
          {kind === 'authentication-required' && (
            <a href={signInHref} className="underline">
              Sign in again
            </a>
          )}
          {uncertain && (
            <>
              <p className="break-all">Original command {command.commandId}</p>
              <Button type="button" onClick={() => void send(true)}>
                Replay original promotion
              </Button>
            </>
          )}
        </div>
      ) : reviewState.data ? (
        <>
          <Coordinates intent={reviewState.data.intent} />
          <h2 className="text-xl font-bold">
            Eligibility:{' '}
            {reviewState.data.eligibility.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
          </h2>
          <ul>
            {reviewState.data.eligibility.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            {reviewState.data.eligibility.scenarios.map((s) => (
              <li
                key={s.fixture.key + ' ' + s.fixture.revision}
                className="break-words"
              >
                {s.fixture.key} / {s.fixture.revision}:{' '}
                {s.reasons.length === 0 ? 'PASS' : s.reasons.join(', ')}
              </li>
            ))}
          </ul>
          {reviewState.data.eligibility.eligible && (
            <>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                <span>
                  I acknowledge promotion of this exact contract using this
                  evidence and policy.
                </span>
              </label>
              <Button type="button" disabled={!ack} onClick={() => void send()}>
                Confirm promotion
              </Button>
            </>
          )}
        </>
      ) : (
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid min-w-0 gap-4"
        >
          <label className="grid gap-2">
            Contract key
            <input
              className="min-w-0 rounded border border-border bg-surface p-2"
              {...form.register('contractKey', {
                required: true,
                pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/,
              })}
            />
          </label>
          <p id="report-reference-help" className="text-sm">
            Supply the complete selected evidence as JSON: an array of objects
            with fixture (key, revision, sha256), reportId and reportDigest.
            Copy exact coordinates from inspected reports. Missing required
            scenarios make the gate ineligible.
          </p>
          <label className="grid gap-2">
            Exact report references
            <textarea
              rows={8}
              aria-describedby="report-reference-help"
              className="min-w-0 rounded border border-border bg-surface p-2 font-mono text-sm"
              {...form.register('reports', {
                required: true,
                maxLength: 120000,
              })}
            />
          </label>
          {form.formState.errors.reports && (
            <p role="alert">
              {form.formState.errors.reports.message ??
                'Report references are required and bounded.'}
            </p>
          )}
          <label className="grid gap-2">
            Promotion rationale
            <textarea
              className="min-w-0 rounded border border-border bg-surface p-2"
              {...form.register('rationale', {
                required: true,
                maxLength: 2000,
                validate: (s) => s === s.trim(),
              })}
            />
          </label>
          {Object.keys(form.formState.errors).length > 0 && (
            <p role="alert">
              Check required fields and use a trimmed rationale of at most 2000
              characters.
            </p>
          )}
          <Button type="submit">Review promotion eligibility</Button>
        </form>
      )}
    </section>
  );
}
