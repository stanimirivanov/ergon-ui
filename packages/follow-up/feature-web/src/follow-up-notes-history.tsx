import type { FollowUpNotes } from '@ergon/follow-up-model';
import type { ReactElement } from 'react';

/** Historical attribution is deliberately separate from current claim authority. */
export function FollowUpNotesHistory({
  notes,
}: {
  readonly notes: FollowUpNotes;
}): ReactElement {
  return (
    <section aria-label="Recorded internal notes" className="space-y-3">
      <h3 className="text-base font-bold text-ink">Recorded internal notes</h3>
      <p className="text-sm text-ink-muted">
        Newest first. Author and claim identify who recorded commentary, not the
        current owner.
      </p>
      {notes.truncated && (
        <p
          role="note"
          className="rounded-md border border-highlight p-3 text-sm text-ink"
        >
          Showing the latest 100 notes. Older history is omitted; this is not a
          complete audit export.
        </p>
      )}
      {notes.items.length === 0 ? (
        <p>No internal notes recorded.</p>
      ) : (
        <ol className="space-y-3">
          {notes.items.map((note) => (
            <li
              key={note.noteId}
              className="space-y-2 rounded-md border border-border bg-surface p-3"
            >
              <p className="break-words whitespace-pre-wrap text-ink">
                {note.text}
              </p>
              <dl className="grid gap-1 text-xs text-ink-muted">
                <div>
                  <dt className="font-bold">Author actor</dt>
                  <dd className="break-all">{note.authorActorId}</dd>
                </div>
                <div>
                  <dt className="font-bold">Authoring claim / revision</dt>
                  <dd className="break-all">
                    {note.claimId} / {note.ownershipRevision}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Authored</dt>
                  <dd>
                    <time dateTime={note.authoredAt}>{note.authoredAt}</time>
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Recorded</dt>
                  <dd>
                    <time dateTime={note.recordedAt}>{note.recordedAt}</time>
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
