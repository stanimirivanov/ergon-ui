import {
  useFreshFollowUpQuestions,
  type FollowUpQuestionsQuery,
} from '@ergon/follow-up-data-access-web';
import type { FollowUpQuestions } from '@ergon/follow-up-model';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { FollowUpQuestionForm } from './follow-up-question-form';
import { useQuestionRecording } from './use-question-recording';
import { QuestionRecordingFeedback } from './question-recording-feedback';
import { FollowUpQuestionAnswer } from './follow-up-question-answer';

/** Lazy private inspection is retired with the enclosing exact owned-work/case disclosure. */
export function FollowUpQuestionsInspector({
  query,
  onAccessLost,
}: {
  readonly query: FollowUpQuestionsQuery;
  readonly onAccessLost: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <Button ref={trigger} variant="quiet" onClick={() => setOpen(true)}>
        Requester questions
      </Button>
      {open && (
        <QuestionDisclosure
          key={JSON.stringify(query)}
          query={query}
          trigger={trigger}
          onClose={() => setOpen(false)}
          onAccessLost={onAccessLost}
        />
      )}
    </div>
  );
}

function QuestionDisclosure({
  query,
  trigger,
  onClose,
  onAccessLost,
}: {
  readonly query: FollowUpQuestionsQuery;
  readonly trigger: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly onAccessLost: () => void;
}): ReactElement {
  const result = useFreshFollowUpQuestions(query);
  const recording = useQuestionRecording(() => {
    if (result.kind !== 'pending') result.refresh();
  }, onAccessLost);
  const hasIntent =
    recording.phase.kind === 'pending' || recording.phase.kind === 'failure';
  const failed =
    result.kind === 'failure' &&
    [
      'not-found',
      'forbidden',
      'authentication-required',
      'authentication-unavailable',
      'actor-not-registered',
      'identity-rejected',
    ].includes(result.failure.kind);
  useLayoutEffect(() => {
    if (failed) onAccessLost();
  }, [failed, onAccessLost]);
  const canRecheck =
    !hasIntent &&
    (result.kind === 'ready' || (result.kind === 'failure' && !failed));
  return (
    <ModalDialog
      id="requester-question-history"
      title="Requester question history"
      dismissLabel="Close requester questions"
      returnFocusRef={trigger}
      onDismiss={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Questions and answers are recorded plain text, not internal notes,
          delivery confirmation, consent, accepted evidence or approval.
        </p>
        {/* Keep this control mounted while its observation changes so keyboard focus cannot fall into the inert background. */}
        <Button
          variant="quiet"
          aria-disabled={!canRecheck}
          onClick={() => {
            if (canRecheck) result.refresh();
          }}
        >
          {result.kind === 'failure' && canRecheck
            ? 'Try questions again'
            : 'Recheck question access'}
        </Button>
        <QuestionRecordingFeedback
          phase={recording.phase}
          onReplay={recording.replay}
        />
        {hasIntent ? (
          recording.phase.kind === 'failure' &&
          recording.phase.failure.kind === 'invalid-question' ? (
            <FollowUpQuestionForm
              initialQuestion={recording.phase.command.question}
              rejected
              onSubmit={(question) =>
                recording.submit({
                  ...query,
                  requestId: crypto.randomUUID(),
                  question,
                })
              }
            />
          ) : null
        ) : result.kind === 'pending' ? (
          <p role="status">Checking current question access…</p>
        ) : result.kind === 'failure' ? (
          <div role="status" className="space-y-3">
            <p>
              Question history unavailable. No retained questions are displayed.
              Try again explicitly or contact an operator if the problem
              continues.
            </p>
          </div>
        ) : (
          <>
            <QuestionHistory questions={result.questions} />
            <FollowUpQuestionForm
              onSubmit={(question) =>
                recording.submit({
                  ...query,
                  requestId: crypto.randomUUID(),
                  question,
                })
              }
            />
          </>
        )}
      </div>
    </ModalDialog>
  );
}

function QuestionHistory({
  questions,
}: {
  readonly questions: FollowUpQuestions;
}): ReactElement {
  return (
    <section aria-label="Recorded requester questions" className="space-y-3">
      <h3 className="text-base font-bold text-ink">
        Recorded requester questions
      </h3>
      <p className="text-sm text-ink-muted">
        Newest recorded first. Historical authorship is not current ownership.
      </p>
      {questions.truncated && (
        <p role="note" className="rounded-md border border-highlight p-3">
          Showing the latest 100 questions. Older history is omitted; no total
          or delivery status is implied.
        </p>
      )}
      {questions.items.length === 0 ? (
        <p>No requester questions recorded.</p>
      ) : (
        <ol className="space-y-3">
          {questions.items.map((question) => (
            <li
              key={question.requestId}
              className="space-y-2 rounded-md border border-border bg-surface p-3"
            >
              <p className="break-words whitespace-pre-wrap text-ink">
                {question.question}
              </p>
              <FollowUpQuestionAnswer response={question.response} />
              <dl className="grid gap-1 text-xs text-ink-muted">
                <div>
                  <dt className="font-bold">Author actor</dt>
                  <dd className="break-all">{question.authorActorId}</dd>
                </div>
                <div>
                  <dt className="font-bold">Authoring claim / revision</dt>
                  <dd className="break-all">
                    {question.claimId} / {question.ownershipRevision}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Requested</dt>
                  <dd>
                    <time dateTime={question.requestedAt}>
                      {question.requestedAt}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Recorded</dt>
                  <dd>
                    <time dateTime={question.recordedAt}>
                      {question.recordedAt}
                    </time>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
