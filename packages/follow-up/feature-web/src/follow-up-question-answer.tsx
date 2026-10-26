import type { RecordedRequesterAnswer } from '@ergon/follow-up-model';
import type { ReactElement } from 'react';

/** Inert history within the parent's fresh disclosure gate; omission must never imply an unanswered question. */
export function FollowUpQuestionAnswer({
  response,
}: {
  readonly response: RecordedRequesterAnswer | null | undefined;
}): ReactElement {
  if (response === undefined)
    return (
      <p className="text-sm text-ink-muted">
        Answer history is not supplied by this server.
      </p>
    );
  if (response === null)
    return (
      <p className="text-sm text-ink-muted">
        No answer recorded in this checked snapshot.
      </p>
    );
  return (
    <section
      aria-label="Recorded requester answer"
      className="space-y-2 rounded-md border border-border p-3"
    >
      <h4 className="text-sm font-bold">Recorded requester answer</h4>
      <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
        {response.answer}
      </p>
      <dl className="grid gap-1 text-xs text-ink-muted">
        <div>
          <dt className="font-bold">Responded (server time)</dt>
          <dd className="[overflow-wrap:anywhere]">
            <time dateTime={response.respondedAt}>{response.respondedAt}</time>
          </dd>
        </div>
        <div>
          <dt className="font-bold">Answer recorded</dt>
          <dd className="[overflow-wrap:anywhere]">
            <time dateTime={response.recordedAt}>{response.recordedAt}</time>
          </dd>
        </div>
      </dl>
      <p className="text-xs text-ink-muted">
        Recorded text is not delivery confirmation, consent, accepted evidence
        or outcome proof.
      </p>
    </section>
  );
}
