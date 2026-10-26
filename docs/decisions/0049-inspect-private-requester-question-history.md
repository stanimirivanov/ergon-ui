# ADR 0049: Inspect private requester-question history

- Status: Accepted
- Date: 2026-10-25
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Inspect questions below fresh owned-work and case gates. Each mounted/rechecked
inspector owns a distinct private RTK observation; history is not delivery or
current authority. The composer/recovery follows in M05-PR20b.

## Context

Ergon PR #210 completes protected reads after immutable storage and authenticated
recording. PR20 needs reviewable read and write slices, not a second notes system
or an interface-only application core. Existing shared notes observations must
keep their established subscription and pending-request sequencing unchanged.

## Decision

- Model owns inert question/history values. Existing follow-up data access owns
  strict bounded decoding, Effect execution, safe failures and RTK resources.
  Feature owns lazy inspection, app binds the reader, ui-web owns modal/focus.
  No package, dependency or project edge is introduced.
- Partition history by tenant/work/case/claim/revision plus a private mounted
  observation ID and local recheck generation. These latter coordinates never
  reach HTTP, URLs, storage or authorization decisions. They prevent reopening
  from deduplicating against a retiring request without duplicating the notes'
  shared-reader sequencing algorithm. This new observation is exclusively owned
  by its mounted hook. Cleanup unsubscribes; ADR 0025's zero-grace last-reader
  policy still owns physical cancellation, never a feature or subscriber abort.
- Abandoned StrictMode setup acquires nothing. Pending/failed state outranks
  retained data; only currentData supplies questions. Opening, rechecking and
  replacing selection always require a distinct observation. Resources never
  enter local state. This does not change ADR 0025's shared notes observations.
- Decode at most 100 unique requests, descending exact recorded time/UUID, the
  selected case and safe historical revisions. Truncation requires 100 records.
  Preserve text and server attribution, including predecessor claims.
- Access/identity denial withdraws enclosing case context through its existing
  inspection barrier. Other failures withhold questions and offer only supported
  read recovery. Questions remain inert text, not notes, delivery, responses,
  consent, evidence, approval or proof. No POST is added in this slice.

## Consequences

Separate overlapping inspectors deliberately acquire separate reads instead of
sharing lasting authorization. Zero-grace eviction bounds private cache lifetime;
closing retires pending work and restores live trigger focus. Exact-case history
has no older paging or request discovery. Backend authority is unchanged.

M05-PR20a delivers history and its simulated guide; PR20b adds composition and
exact uncertain replay after review/merge. Requester rendering/responses remain
PR22. Deploy backend PR19a/b/c first. Rollback removes inspection without changing
immutable data. Existing note, ownership-command and shell behavior is preserved.

Protocol, lifetime, browser, accessibility and pinned-Linux visual checks own
their respective evidence; simulation is not proof of live OIDC or PostgreSQL.

## Alternatives considered

- Ordinary cached refetch-on-mount: insufficient for an older same-key pending read.
- Copy notes' lifecycle algorithm: rejected; duplicate race-sensitive sequencing.
- Generalize all existing private hooks now: rejected as unnecessary refactoring.
- Copy receipts into local state or expose a disabled composer: rejected; neither
  delivers the current read slice or preserves explicit state ownership.
