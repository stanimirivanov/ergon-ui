import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { isRequesterAnswerText } from '@ergon/requester-progress-data-access-web';
import { Button } from '@ergon/ui-web';

/** RHF owns exact draft/errors. Unmount retires asynchronous validation; text is never trimmed and is never persisted. */
export function RequesterAnswerForm({
  question,
  initialAnswer = '',
  rejected = false,
  onSubmit,
}: {
  readonly question: string;
  readonly initialAnswer?: string;
  readonly rejected?: boolean;
  readonly onSubmit: (answer: string) => void;
}): ReactElement {
  const id = useId();
  const form = useForm<{ answer: string; reviewed: boolean }>({
    defaultValues: { answer: initialAnswer, reviewed: false },
  });
  const { setFocus, setError } = form;
  const lifetime = useRef(0);
  useLayoutEffect(() => {
    lifetime.current += 1;
    setFocus('answer');
    return () => {
      lifetime.current += 1;
    };
  }, [setFocus]);
  useLayoutEffect(() => {
    if (rejected)
      setError('answer', {
        message:
          'The server rejected this answer. Correct the input and review it again.',
      });
  }, [rejected, setError]);
  return (
    <section
      aria-label="Answer this question"
      className="min-w-0 rounded-lg border border-accent bg-surface p-5 [overflow-wrap:anywhere]"
    >
      <h2 className="text-xl font-bold">Answer this question</h2>
      <p className="mt-3 font-bold whitespace-pre-wrap">{question}</p>
      <p id={`${id}-limits`} className="mt-3 text-sm text-ink-muted">
        One final plain-text answer, 1–4000 Unicode characters. Recording is not
        delivery, consent, evidence acceptance or proof. Rechecking discards
        this draft; leaving the page retires recovery intent but cannot undo a
        write.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event): void => {
          const generation = lifetime.current;
          void form.handleSubmit(({ answer }) => {
            if (generation === lifetime.current) onSubmit(answer);
          })(event);
        }}
      >
        <label htmlFor={`${id}-answer`} className="font-bold">
          Your answer
        </label>
        <textarea
          id={`${id}-answer`}
          rows={5}
          aria-invalid={form.formState.errors.answer !== undefined}
          aria-describedby={`${id}-limits ${id}-error ${id}-count`}
          className="w-full rounded-md border border-border bg-canvas p-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
          {...form.register('answer', {
            validate: (value) =>
              isRequesterAnswerText(value) ||
              'Enter nonblank text of at most 4000 Unicode characters, without NUL or unpaired surrogates.',
          })}
        />
        <p id={`${id}-count`} className="text-xs text-ink-muted">
          {Array.from(form.watch('answer')).length} / 4000 characters
        </p>
        <p id={`${id}-error`} role="alert">
          {form.formState.errors.answer?.message}
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            aria-invalid={form.formState.errors.reviewed !== undefined}
            aria-describedby={`${id}-review-error`}
            {...form.register('reviewed', {
              validate: (value) =>
                value || 'Review this final answer before recording.',
            })}
          />
          I reviewed this final answer and understand that it cannot be edited
          here.
        </label>
        <p id={`${id}-review-error`} role="alert">
          {form.formState.errors.reviewed?.message}
        </p>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Record final answer
        </Button>
      </form>
    </section>
  );
}
