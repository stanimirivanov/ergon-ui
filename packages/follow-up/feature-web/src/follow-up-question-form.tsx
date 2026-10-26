import { isFollowUpQuestionText } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

/** RHF owns exact text/acknowledgement and errors. Unmount retires drafts and validation callbacks; never normalize input. */
export function FollowUpQuestionForm({
  initialQuestion = '',
  rejected = false,
  onSubmit,
}: {
  readonly initialQuestion?: string;
  readonly rejected?: boolean;
  readonly onSubmit: (question: string) => void;
}): ReactElement {
  const form = useForm<{ question: string; acknowledged: boolean }>({
    defaultValues: { question: initialQuestion, acknowledged: false },
  });
  const { setError, setFocus } = form;
  const lifetime = useRef(0);
  useLayoutEffect(() => {
    lifetime.current += 1;
    return () => {
      lifetime.current += 1;
    };
  }, []);
  useLayoutEffect(() => {
    if (rejected) {
      setError('question', {
        message:
          'The server rejected this question or ownership revision. Correct the input and confirm again.',
      });
      setFocus('question');
    }
  }, [rejected, setError, setFocus]);
  return (
    <section
      aria-label="Record requester question"
      className="space-y-3 border-t border-border pt-4"
    >
      <h3 className="text-base font-bold text-ink">
        Record requester question
      </h3>
      <p id="question-constraints" className="text-sm text-ink-muted">
        For this case’s bound requester. Use 1–4000 Unicode characters, without
        NUL or unpaired surrogates. Recording does not confirm delivery, an
        answer or evidence. Rechecking discards drafts. Closing also retires
        recovery intent, but cannot undo an already recorded question.
      </p>
      <form
        className="space-y-3"
        onSubmit={(event): void => {
          const generation = lifetime.current;
          // RHF validation may finish after a recheck has removed this form.
          void form.handleSubmit(({ question }) => {
            if (generation === lifetime.current) onSubmit(question);
          })(event);
        }}
      >
        <label
          className="block font-semibold text-ink"
          htmlFor="requester-question-text"
        >
          Question for the requester
        </label>
        <textarea
          id="requester-question-text"
          rows={4}
          aria-describedby="question-constraints question-length question-error"
          aria-invalid={form.formState.errors.question !== undefined}
          className="w-full rounded-md border border-border bg-canvas p-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
          {...form.register('question', {
            validate: (value) =>
              isFollowUpQuestionText(value) ||
              'Enter nonblank text of at most 4000 Unicode characters, without NUL or unpaired surrogates.',
          })}
        />
        <p id="question-length" className="text-xs text-ink-muted">
          {Array.from(form.watch('question')).length} / 4000 characters
        </p>
        <p id="question-error" role="alert">
          {form.formState.errors.question?.message}
        </p>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            aria-invalid={form.formState.errors.acknowledged !== undefined}
            aria-describedby="question-acknowledgement-error"
            {...form.register('acknowledged', {
              validate: (value) =>
                value ||
                'Confirm the requester and recording limits before continuing.',
            })}
          />
          I reviewed this question for the bound requester and understand that
          recording is not delivery or proof.
        </label>
        <p id="question-acknowledgement-error" role="alert">
          {form.formState.errors.acknowledged?.message}
        </p>
        <Button type="submit">Record requester question</Button>
      </form>
    </section>
  );
}
