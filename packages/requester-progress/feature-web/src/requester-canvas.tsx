import type { ReactElement, ReactNode } from 'react';
import type { RequesterProgress } from '@ergon/requester-progress-data-access-web';

/**
 * Presentation of an already authorized projection; no local copy, reads or
 * authority decisions. Mount only beneath the fresh-progress disclosure gate.
 * Concept-art stages are deliberately absent: OPEN supplies no execution phase.
 */
export function RequesterCanvas({
  progress,
}: {
  readonly progress: RequesterProgress;
}): ReactElement {
  const resolved = progress.status === 'VERIFIED_RESOLVED';
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <article
        className="grid min-w-0 content-start gap-6"
        aria-labelledby="request-goal"
      >
        <header className="grid gap-4">
          <h2
            id="request-goal"
            className="font-display text-3xl font-black tracking-tight [overflow-wrap:anywhere] sm:text-4xl"
          >
            {progress.goal}
          </h2>
          <p className="max-w-3xl leading-7 text-ink-muted">
            Your request, its recorded status, and what this view can tell you.
          </p>
        </header>
        <section
          aria-labelledby="recorded-status"
          className="rounded-lg border border-border bg-surface p-5"
        >
          <h3
            id="recorded-status"
            className="text-xs font-bold tracking-widest text-ink-muted uppercase"
          >
            Recorded case status
          </h3>
          <p
            className={`mt-3 inline-flex rounded-md border px-3 py-1 text-sm font-bold ${resolved ? 'border-success bg-success-soft text-success' : 'border-accent bg-accent-soft text-accent-strong'}`}
          >
            {resolved ? 'Verified resolved' : 'Open'}
          </p>
          <p className="mt-3 leading-6 text-ink-muted">
            {resolved
              ? 'The case records an accepted verified outcome. Internal proof and execution details are not disclosed here.'
              : 'The case remains open. This does not identify an active run, an approval, a waiting person or an estimated completion time.'}
          </p>
        </section>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <CanvasCard title="What we need from you" marker="01">
            <p>No response or upload can be submitted in this view.</p>
            <p className="text-ink-muted">
              This progress snapshot does not disclose information requests. It
              cannot establish whether someone is waiting for you.
            </p>
          </CanvasCard>
          <CanvasCard title="What Ergon is checking" marker="02">
            <p>Individual checks are not disclosed.</p>
            <p className="text-ink-muted">
              An open case is not evidence that a check is running. No execution
              stages or live activity are inferred here.
            </p>
          </CanvasCard>
          <CanvasCard title="Outcome proof" marker="03">
            <p className="font-bold">
              {resolved
                ? 'Accepted outcome recorded'
                : 'No verified resolution recorded'}
            </p>
            <p className="text-ink-muted">
              {resolved
                ? 'The server reports the verified case state. This view does not receive the proof, its recording time or individual success conditions.'
                : 'The current case state is OPEN. This does not tell you whether internal verification has been attempted or is pending.'}
            </p>
          </CanvasCard>
          <CanvasCard title="Confirm the outcome" marker="04">
            <p>Confirmation is not available in this view.</p>
            <p className="text-ink-muted">
              Reading or rechecking progress cannot confirm an outcome, approve
              an action or change the case.
            </p>
          </CanvasCard>
        </div>
      </article>
      <aside
        aria-labelledby="request-details"
        className="min-w-0 rounded-lg border border-border bg-surface/90 p-5"
      >
        <h2 id="request-details" className="text-lg font-bold">
          Request details
        </h2>
        <dl className="mt-5 grid gap-5 text-sm">
          <div>
            <dt className="font-bold text-ink-muted">Case ID</dt>
            <dd className="mt-1 font-mono [overflow-wrap:anywhere]">
              {progress.caseId}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-muted">Opened</dt>
            <dd className="mt-1 [overflow-wrap:anywhere]">
              <time dateTime={progress.openedAt}>{progress.openedAt}</time>
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-muted">Last case update</dt>
            <dd className="mt-1 [overflow-wrap:anywhere]">
              <time dateTime={progress.updatedAt}>{progress.updatedAt}</time>
            </dd>
          </div>
        </dl>
        <section
          aria-labelledby="snapshot-notice"
          className="mt-6 border-t border-border pt-5"
        >
          <h3 id="snapshot-notice" className="font-bold">
            A checked snapshot
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            These are case timestamps, not proof recording times. This is a
            checked snapshot, not live monitoring. Recheck deliberately when you
            need a new observation.
          </p>
        </section>
        <section
          aria-labelledby="privacy-notice"
          className="mt-6 border-t border-border pt-5"
        >
          <h3 id="privacy-notice" className="font-bold">
            Your private view
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            This page shows only the progress returned for your current session.
            Internal notes, evidence, operator identity and activity logs are
            not provided.
          </p>
        </section>
      </aside>
    </div>
  );
}

function CanvasCard({
  title,
  marker,
  children,
}: {
  readonly title: string;
  readonly marker: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <section className="min-w-0 rounded-lg border border-ink/70 bg-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="rounded-md bg-accent-soft px-3 py-2 font-mono text-sm font-bold text-accent-strong"
        >
          {marker}
        </span>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      </div>
      <div className="grid gap-3 text-sm leading-6">{children}</div>
    </section>
  );
}
