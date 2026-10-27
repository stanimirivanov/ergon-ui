import { useState, type ReactElement } from 'react';
import type {
  ProgressQuery,
  ProgressRead,
} from '@ergon/requester-progress-data-access-web';
import { Button } from '@ergon/ui-web';
import { RequesterCanvas } from './requester-canvas';
import { RequesterAnswerForm } from './requester-answer-form';
import { requesterAnswerRecovery } from './requester-answer-recovery';
import { useAnswerRecording } from './use-answer-recording';

/** Keeps only selected identity and command intent across fresh checks. Acknowledgement never becomes history; pending/failure hides the old canvas before command I/O. */
export function RequesterAnswerWorkspace({
  query,
  read,
  attempt,
  recheck,
  focusHeading,
  signInHref,
}: {
  readonly query: ProgressQuery;
  readonly read: ProgressRead;
  readonly attempt: number;
  readonly recheck: () => void;
  readonly focusHeading: () => void;
  readonly signInHref: string;
}): ReactElement {
  const [selected, setSelected] = useState<{
    requestId: string;
    attempt: number;
  }>();
  const { phase, submit, replay } = useAnswerRecording(recheck);
  const rejected =
    phase.kind === 'failure' &&
    requesterAnswerRecovery(phase.failure, phase.mode).canCorrect;
  const blocked =
    phase.kind === 'pending' ||
    (phase.kind === 'failure' && !rejected && attempt === phase.attempt);
  const canDraft =
    phase.kind === 'idle' || phase.kind === 'recorded' || rejected;
  const canReplay =
    phase.kind === 'failure' &&
    requesterAnswerRecovery(phase.failure, phase.mode).replay &&
    read.kind === 'ready' &&
    read.progress.status === 'OPEN';
  const question =
    read.kind === 'ready' &&
    read.progress.status === 'OPEN' &&
    selected?.attempt === attempt &&
    canDraft
      ? read.questions.items.find(
          (item) =>
            item.requestId === selected.requestId && item.response === null,
        )
      : undefined;
  return (
    <div className="grid min-w-0 gap-6">
      {/* Keep the empty live region registered without allocating a blank grid row. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={phase.kind === 'idle' ? 'sr-only' : undefined}
      >
        {phase.kind === 'pending' ? (
          <p role="status">
            Recording the exact answer… Previous case details are hidden.
            Leaving cannot undo a write.
          </p>
        ) : null}
        {phase.kind === 'recorded' ? (
          <p role="status">
            Answer recording acknowledged. Current history requires a separate
            check.
          </p>
        ) : null}
        {phase.kind === 'failure' ? (
          <section
            aria-label="Answer recording result"
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="font-bold">Answer recording result</h2>
            <p className="mt-3">
              {requesterAnswerRecovery(phase.failure, phase.mode).message}
            </p>
            {canReplay ? (
              <Button
                onClick={() => {
                  focusHeading();
                  replay(attempt);
                }}
              >
                Retry exact answer
              </Button>
            ) : null}
            {phase.failure.kind === 'authentication-required' &&
            read.kind === 'ready' ? (
              <a href={signInHref} className="font-bold underline">
                Sign in to Ergon
              </a>
            ) : null}
            <p className="mt-3 text-sm">
              Recheck progress to read independently. Recovery keeps the
              original answer in memory until you leave this case.
            </p>
          </section>
        ) : null}
      </div>
      {read.kind === 'ready' && !blocked ? (
        <RequesterCanvas
          progress={read.progress}
          questions={read.questions}
          onAnswer={
            canDraft
              ? (requestId) => setSelected({ requestId, attempt })
              : undefined
          }
          answerPanel={
            question ? (
              <RequesterAnswerForm
                key={`${attempt}:${question.requestId}`}
                question={question.question}
                {...(rejected && phase.command.requestId === question.requestId
                  ? { initialAnswer: phase.command.answer, rejected: true }
                  : {})}
                onSubmit={(answer) => {
                  focusHeading();
                  submit(
                    {
                      ...query,
                      requestId: question.requestId,
                      responseId: globalThis.crypto.randomUUID(),
                      answer,
                    },
                    attempt,
                  );
                }}
              />
            ) : null
          }
        />
      ) : null}
    </div>
  );
}
