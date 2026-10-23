import {
  useFreshFollowUpNotes,
  type FollowUpNotesQuery,
} from '@ergon/follow-up-data-access-web';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { FollowUpNoteComposer } from './follow-up-note-composer';
import { FollowUpNotesHistory } from './follow-up-notes-history';
import { caseSummaryFailureCopy } from './resolver-follow-up-case-summary-copy';
import { withdrawsNoteAccess } from './follow-up-note-failure-copy';

/** Lazy disclosure stays below the current owned-work and case-context gates. */
export function FollowUpNotesInspector({
  query,
  onAccessLost,
}: {
  readonly query: FollowUpNotesQuery;
  readonly onAccessLost: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <Button
        ref={trigger}
        type="button"
        variant="quiet"
        onClick={() => setOpen(true)}
      >
        Internal notes
      </Button>
      {open && (
        <NotesDisclosure
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

function NotesDisclosure({
  query,
  trigger,
  onClose,
  onAccessLost,
}: {
  readonly query: FollowUpNotesQuery;
  readonly trigger: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly onAccessLost: () => void;
}): ReactElement {
  const result = useFreshFollowUpNotes(query);
  const [saved, setSaved] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);
  const failed =
    result.kind === 'failure' && withdrawsNoteAccess(result.failure);
  useLayoutEffect(() => {
    if (failed) onAccessLost();
  }, [failed, onAccessLost]);
  return (
    <ModalDialog
      id="internal-follow-up-notes"
      title="Internal follow-up notes"
      dismissLabel="Close internal notes"
      returnFocusRef={trigger}
      onDismiss={onClose}
    >
      <div className="space-y-5">
        <p className="text-sm text-ink-muted">
          Current-owner access is checked for every read and append. Notes do
          not change the case or run.
        </p>
        <p role="status" tabIndex={-1} ref={status}>
          {saved
            ? 'Note recorded. This receipt is historical; history is checked again below.'
            : 'Internal commentary is not evidence or proof.'}
        </p>
        {result.kind === 'pending' ? (
          <p role="status">Checking current notes access…</p>
        ) : result.kind === 'failure' ? (
          <div role="status" className="space-y-3">
            <p>{caseSummaryFailureCopy(result.failure).description}</p>
            {!failed && caseSummaryFailureCopy(result.failure).canRetry && (
              <Button type="button" onClick={result.retry}>
                Try notes again
              </Button>
            )}
          </div>
        ) : (
          <>
            <FollowUpNotesHistory notes={result.notes} />
            <FollowUpNoteComposer
              query={query}
              onAccessLost={onAccessLost}
              onSaved={() => {
                status.current?.focus();
                setSaved(true);
                result.refresh();
              }}
            />
          </>
        )}
      </div>
    </ModalDialog>
  );
}
