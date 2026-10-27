import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import {
  normalizeIntakeGoal,
  normalizeIntakeObservation,
} from '@ergon/requester-intake-data-access-web';
import { Button } from '@ergon/ui-web';
export interface IntakeInput {
  readonly goal: string;
  readonly initialObservation: string;
}
/** RHF owns draft/errors/review. Removal retires asynchronous validation; accepted raw values stay unchanged for exact replay. */
export function IntakeForm({
  initial,
  rejected = false,
  onSubmit,
}: {
  readonly initial?: IntakeInput;
  readonly rejected?: boolean;
  readonly onSubmit: (value: IntakeInput) => void;
}): ReactElement {
  const id = useId();
  const form = useForm<{
    goal: string;
    initialObservation: string;
    reviewed: boolean;
  }>({
    defaultValues: {
      goal: initial?.goal ?? '',
      initialObservation: initial?.initialObservation ?? '',
      reviewed: false,
    },
  });
  const { setFocus, setError } = form;
  const generation = useRef(0);
  useLayoutEffect(() => {
    const lifetime = generation.current + 1;
    generation.current = lifetime;
    setFocus('goal');
    return () => {
      generation.current = lifetime + 1;
    };
  }, [setFocus]);
  useLayoutEffect(() => {
    if (rejected)
      setError('root.server', {
        message: 'The input was rejected. Check both fields and review again.',
      });
  }, [rejected, setError]);
  return (
    <form
      aria-label="New request"
      className="grid min-w-0 gap-4 rounded-lg border border-border bg-surface p-5"
      onSubmit={(event): void => {
        const lifetime = generation.current;
        void form.handleSubmit(({ goal, initialObservation }) => {
          if (lifetime === generation.current)
            onSubmit({ goal, initialObservation });
        })(event);
      }}
    >
      <h2 className="text-xl font-bold">Describe your request</h2>
      <p id={id + '-limits'} className="text-sm text-ink-muted">
        Leading and trailing whitespace is removed by the server. Limits use
        UTF-16 text units after trimming; an emoji may count as two units. Text
        is untrusted input, not accepted evidence or approval.
      </p>
      <label htmlFor={id + '-goal'} className="font-bold">
        Desired outcome
      </label>
      <textarea
        id={id + '-goal'}
        rows={2}
        aria-invalid={!!form.formState.errors.goal}
        aria-describedby={
          id + '-goal-error ' + id + '-goal-count ' + id + '-limits'
        }
        className="w-full rounded-md border border-border bg-canvas p-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
        {...form.register('goal', {
          validate: (value) =>
            normalizeIntakeGoal(value) !== undefined ||
            'Enter a nonblank outcome of at most 500 UTF-16 units, without NUL or malformed Unicode.',
        })}
      />
      <p id={id + '-goal-count'} className="text-xs text-ink-muted">
        {form.watch('goal').length} raw units; limit 500 after trimming
      </p>
      <p id={id + '-goal-error'} role="alert">
        {form.formState.errors.goal?.message}
      </p>
      <label htmlFor={id + '-observation'} className="font-bold">
        What happened?
      </label>
      <textarea
        id={id + '-observation'}
        rows={5}
        aria-invalid={!!form.formState.errors.initialObservation}
        aria-describedby={
          id +
          '-observation-error ' +
          id +
          '-observation-count ' +
          id +
          '-limits'
        }
        className="w-full rounded-md border border-border bg-canvas p-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
        {...form.register('initialObservation', {
          validate: (value) =>
            normalizeIntakeObservation(value) !== undefined ||
            'Enter nonblank details of at most 8000 UTF-16 units, without NUL or malformed Unicode.',
        })}
      />
      <p id={id + '-observation-count'} className="text-xs text-ink-muted">
        {form.watch('initialObservation').length} raw units; limit 8000 after
        trimming
      </p>
      <p id={id + '-observation-error'} role="alert">
        {form.formState.errors.initialObservation?.message}
      </p>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          aria-invalid={!!form.formState.errors.reviewed}
          aria-describedby={id + '-review-error'}
          {...form.register('reviewed', {
            validate: (value) =>
              value || 'Review this request before submitting.',
          })}
        />
        I reviewed this request. Creating it does not start an automatic
        resolution run or grant approval.
      </label>
      <p id={id + '-review-error'} role="alert">
        {form.formState.errors.reviewed?.message}
      </p>
      <p role="alert">{form.formState.errors.root?.server?.message}</p>
      <p className="text-sm text-ink-muted">
        Recovery stays only in this page's memory. Leaving or reloading discards
        it and cannot undo a server write. Do not submit a replacement after
        uncertainty.
      </p>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create request
      </Button>
    </form>
  );
}
