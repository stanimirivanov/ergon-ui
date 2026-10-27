import type { ReactElement } from 'react';
import type { RequesterQuestions } from '@ergon/requester-progress-data-access-web';
import { Button } from '@ergon/ui-web';

/** Inert, bounded history beneath the page's fresh two-resource gate; no authority or editable draft is inferred. */
export function RequesterQuestionHistory({
  questions,
  closed,
  onAnswer,
}: {
  readonly questions: RequesterQuestions;
  readonly closed: boolean;
  readonly onAnswer?: ((requestId: string) => void) | undefined;
}): ReactElement {
  return (
    <section
      aria-labelledby="requester-questions"
      className="min-w-0 rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="requester-questions" className="text-xl font-bold">
        Questions and answers
      </h2>
      <p className="mt-3 text-sm text-ink-muted">
        Recorded text is not delivery confirmation, consent, accepted evidence
        or outcome proof. Recorded answers cannot be edited here.
      </p>
      {closed ? (
        <p className="mt-3 font-bold">
          This case is closed. Its recorded history remains readable.
        </p>
      ) : null}
      {questions.truncated ? (
        <p className="mt-3 font-bold">
          Latest 100 questions only. Older questions and their answers are
          omitted.
        </p>
      ) : null}
      {questions.items.length === 0 ? (
        <p className="mt-3">No questions recorded in this checked snapshot.</p>
      ) : (
        <ol
          aria-label="Recorded questions and answers"
          className="mt-4 grid gap-4"
        >
          {questions.items.map((item) => (
            <li
              key={item.requestId}
              className="min-w-0 rounded-lg border border-border p-4 [overflow-wrap:anywhere]"
            >
              <p className="font-bold whitespace-pre-wrap">{item.question}</p>
              <dl className="mt-3 text-xs text-ink-muted">
                <div>
                  <dt>Requested (server time)</dt>
                  <dd>
                    <time dateTime={item.requestedAt}>{item.requestedAt}</time>
                  </dd>
                </div>
                <div>
                  <dt>Question recorded</dt>
                  <dd>
                    <time dateTime={item.recordedAt}>{item.recordedAt}</time>
                  </dd>
                </div>
              </dl>
              {item.response === undefined ? (
                <p className="mt-3">
                  Answer history is not supplied by this server.
                </p>
              ) : item.response === null ? (
                <div className="mt-3">
                  <p>No answer recorded in this checked snapshot.</p>
                  {!closed && onAnswer ? (
                    <Button
                      onClick={() => onAnswer(item.requestId)}
                      aria-label={`Answer question: ${item.question}`}
                    >
                      Answer question
                    </Button>
                  ) : null}
                </div>
              ) : (
                <section
                  aria-label="Recorded answer"
                  className="mt-4 border-t border-border pt-4"
                >
                  <h3 className="font-bold">Recorded answer</h3>
                  <p className="mt-2 whitespace-pre-wrap">
                    {item.response.answer}
                  </p>
                  <dl className="mt-3 text-xs text-ink-muted">
                    <div>
                      <dt>Responded (server time)</dt>
                      <dd>
                        <time dateTime={item.response.respondedAt}>
                          {item.response.respondedAt}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Answer recorded</dt>
                      <dd>
                        <time dateTime={item.response.recordedAt}>
                          {item.response.recordedAt}
                        </time>
                      </dd>
                    </div>
                  </dl>
                </section>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
