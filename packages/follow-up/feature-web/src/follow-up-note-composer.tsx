import {
  followUpNotesApi,
  normalizeFollowUpNoteFailure,
  type AppendFollowUpNoteCommand,
  type FollowUpNotesQuery,
  type FollowUpNoteFailure,
} from '@ergon/follow-up-data-access-web';
import { isFollowUpNoteText } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import {
  canReplayNote,
  noteFailureCopy,
  withdrawsNoteAccess,
} from './follow-up-note-failure-copy';

type Attempt =
  | { readonly kind: 'pending'; readonly command: AppendFollowUpNoteCommand }
  | {
      readonly kind: 'failure';
      readonly command: AppendFollowUpNoteCommand;
      readonly failure: FollowUpNoteFailure;
    };

/**
 * Owns RHF draft and immutable command intent, never a notes resource copy.
 * Closing/withdrawing retires callbacks and in-flight mutation state; no automatic
 * replay or persistent draft. A successful receipt triggers a fresh history gate.
 */
export function FollowUpNoteComposer({
  query,
  onSaved,
  onAccessLost,
}: {
  readonly query: FollowUpNotesQuery;
  readonly onSaved: () => void;
  readonly onAccessLost: () => void;
}): ReactElement {
  const form = useForm<{ text: string }>({ defaultValues: { text: '' } });
  const [attempt, setAttempt] = useState<Attempt>();
  const [append] = followUpNotesApi.useAppendFollowUpNoteMutation();
  const lifetime = useRef(0);
  const pending = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const { setFocus } = form;
  useLayoutEffect(() => {
    if (
      attempt?.kind === 'failure' &&
      attempt.failure.kind === 'invalid-note'
    ) {
      setFocus('text');
    } else if (attempt !== undefined) feedback.current?.focus();
  }, [attempt, setFocus]);
  const requestHandle = useRef<ReturnType<typeof append> | undefined>(
    undefined,
  );
  useLayoutEffect(() => {
    lifetime.current += 1;
    return () => {
      lifetime.current += 1;
      requestHandle.current?.abort();
      requestHandle.current?.reset();
    };
  }, []);

  async function submit(command: AppendFollowUpNoteCommand): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    const generation = lifetime.current;
    setAttempt({ kind: 'pending', command });
    const handle = append(command);
    requestHandle.current = handle;
    const result = await handle;
    if (generation !== lifetime.current) return;
    pending.current = false;
    if (result.data !== undefined) {
      onSaved();
      return;
    }
    const failure = normalizeFollowUpNoteFailure(result.error);
    if (withdrawsNoteAccess(failure)) {
      onAccessLost();
      return;
    }
    setAttempt({ kind: 'failure', command, failure });
    if (failure.kind === 'invalid-note') {
      form.setError(
        'text',
        { message: noteFailureCopy(failure) },
        { shouldFocus: true },
      );
    }
  }

  const text = form.watch('text');
  return (
    <section
      aria-label="Add internal note"
      className="space-y-3 border-t border-border pt-4"
    >
      <h3 className="text-base font-bold text-ink">Add internal note</h3>
      <p id="note-constraints" className="text-sm text-ink-muted">
        Commentary only—not evidence, authorization or case completion. Use
        1–4000 Unicode characters. Draft and retry intent are discarded when
        this inspector closes.
      </p>
      {attempt === undefined ||
      (attempt.kind === 'failure' &&
        attempt.failure.kind === 'invalid-note') ? (
        <form
          onSubmit={form.handleSubmit(({ text }) =>
            submit({ ...query, noteId: crypto.randomUUID(), text }),
          )}
          className="space-y-3"
        >
          <label
            htmlFor="internal-note-text"
            className="block font-semibold text-ink"
          >
            Internal note text
          </label>
          <textarea
            id="internal-note-text"
            rows={5}
            aria-describedby="note-constraints note-length note-error"
            aria-invalid={form.formState.errors.text !== undefined}
            className="w-full rounded-md border border-border bg-canvas p-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
            {...form.register('text', {
              validate: (value) =>
                isFollowUpNoteText(value) ||
                'Enter nonblank text, at most 4000 Unicode characters, without NUL or unpaired surrogates.',
            })}
          />
          <p id="note-length" className="text-xs text-ink-muted">
            {Array.from(text).length} / 4000 characters
          </p>
          <p id="note-error" role="alert" className="text-sm text-ink">
            {form.formState.errors.text?.message}
          </p>
          <Button type="submit">Save internal note</Button>
        </form>
      ) : attempt.kind === 'pending' ? (
        <p ref={feedback} tabIndex={-1} role="status">
          Saving internal note… Do not create a replacement note.
        </p>
      ) : (
        <div role="status" className="space-y-3">
          <p ref={feedback} tabIndex={-1}>
            {noteFailureCopy(attempt.failure)}
          </p>
          {canReplayNote(attempt.failure) && (
            <Button type="button" onClick={() => void submit(attempt.command)}>
              Retry exact note
            </Button>
          )}
          <p className="text-sm text-ink-muted">
            Retry preserves the same note ID, claim, ownership revision and
            exact text. There is no automatic retry.
          </p>
        </div>
      )}
    </section>
  );
}
