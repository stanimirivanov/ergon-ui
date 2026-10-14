import type { RunSupervisorCandidatePage } from '@ergon/run-supervision-data-access-web';
import { Button } from '@ergon/ui-web';
import { useForm } from 'react-hook-form';
import { useId, useLayoutEffect, useRef, type ReactElement } from 'react';

interface HandoverFields {
  supervisorActorId: string;
  understandsTransfer: boolean;
}

/** RHF owns recipient, acknowledgement and field errors; candidates remain the current remote projection. */
export function RunSupervisorHandoverForm({
  page,
  onConfirm,
}: {
  readonly page: RunSupervisorCandidatePage;
  readonly onConfirm: (actorId: string) => void;
}): ReactElement {
  const id = useId();
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HandoverFields>({
    defaultValues: { supervisorActorId: '', understandsTransfer: false },
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        // RHF validation can settle after the page, epoch or access gate retired
        // this form. Such a callback must not manufacture a late command.
        if (mounted.current) onConfirm(values.supervisorActorId);
      })}
      className="flex min-w-0 flex-col gap-4"
    >
      <div>
        <label htmlFor={`${id}-recipient`} className="text-sm font-semibold">
          Eligible recipient
        </label>
        <select
          id={`${id}-recipient`}
          aria-invalid={errors.supervisorActorId !== undefined}
          aria-describedby={
            errors.supervisorActorId ? `${id}-recipient-error` : undefined
          }
          className="mt-2 w-full min-w-0 rounded-md border border-border bg-surface p-3 text-sm text-ink focus-visible:outline-accent-strong"
          {...register('supervisorActorId', {
            required: 'Choose an eligible recipient.',
            validate: (value) =>
              page.entries.some((entry) => entry.actorId === value) ||
              'Choose a recipient from this current page.',
          })}
        >
          <option value="">Choose a resolver</option>
          {page.entries.map((entry) => (
            <option key={entry.actorId} value={entry.actorId}>
              Resolver {entry.actorId}
            </option>
          ))}
        </select>
        {errors.supervisorActorId ? (
          <p
            role="alert"
            id={`${id}-recipient-error`}
            className="mt-2 text-sm text-ink"
          >
            {errors.supervisorActorId.message}
          </p>
        ) : null}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          aria-invalid={errors.understandsTransfer !== undefined}
          aria-describedby={
            errors.understandsTransfer ? `${id}-confirm-error` : undefined
          }
          {...register('understandsTransfer', {
            required:
              'Confirm that your supervision access will be transferred.',
          })}
        />
        <span>
          I understand that my supervision access will be transferred to the
          selected resolver.
        </span>
      </label>
      {errors.understandsTransfer ? (
        <p role="alert" id={`${id}-confirm-error`} className="text-sm text-ink">
          {errors.understandsTransfer.message}
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">
        The server checks both resolvers again at confirmation. Transfer
        preserves audit history and does not approve, execute, or resolve the
        run.
      </p>
      <Button type="submit" disabled={page.entries.length === 0}>
        Confirm handover
      </Button>
    </form>
  );
}
