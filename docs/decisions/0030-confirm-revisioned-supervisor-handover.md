# ADR 0030: Confirm revisioned supervisor handover

- Status: Proposed
- Date: 2026-10-14
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Consume Ergon's current-supervisor handover contract with a confirmed, ephemeral
form. RTK owns recipient and run resources; the feature owns immutable command
intent and its committed disclosure phase. No lease or runtime control is inferred.

## Context

The assigned Console is read-only and its original assignment is not a control
lease. Ergon's [handover decision](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/decisions/0048-allow-revisioned-browser-supervisor-handover.md)
adds current-supervisor epochs, minimal eligible recipient IDs and exact command
replay. A successful candidate read is not lasting authority, and losing a POST
response does not establish that the transfer failed. The existing fresh-read
and modal lifecycle decisions remain required.

## Decision

- Decode `supervisionRevision` and `handoverSupported` together. Both missing
  means older-server support is unavailable; partial/null or terminal-enabled
  metadata is invalid. Never infer a lease, revision zero, or transfer authority
  from an old assignment label.
- Keep candidate resources in the run-supervision RTK API, keyed by exact
  tenant/run/expected epoch/limit/private cursor. Reuse the proven fresh-read
  acquisition and subscriber-retirement mechanism; close/reopen cannot revive
  pre-close candidate identities. No directory cache or interface-only core.
- A failed candidate lookup also closes discovery/detail and the modal before
  paint: it rechecks supervision, not merely directory availability. Retain no
  unconfirmed command, and offer fresh recovery rather than mutation replay.
- Introduce React Hook Form 7.90.0 only for this stateful recipient and explicit
  acknowledgement form. Form errors/values belong there; page changes retire
  hidden selections. The MIT dependency supports React 19 and owns no HTTP,
  authority or resource cache. Remove it only with a tested form replacement.
- Compose the existing native `ModalDialog` for focus, inertness, keyboard
  containment and placement. Feature components own the recipient form and
  private traversal. Display only registered resolver IDs because the backend
  exposes no display-name/email/provider-subject directory.
- A confirmed command captures one unpredictable ID and the exact recipient,
  tenant/run and expected supervision epoch. The feature commits a submitting
  phase that suspends discovery and detail, unmounts recipient disclosure, and
  focuses the persistent execution heading before RTK starts I/O. Retire late
  callbacks after close, query replacement or tenant unmount; StrictMode cannot
  replay the write.
- Effect performs invocation-local CSRF setup, POST and validated receipt
  decoding under one deadline, with no automatic transfer retry. A malformed,
  lost, timed-out or defective response remains uncertain and allows only an
  explicit exact-command replay. Definite conflicts require a fresh run read
  before another confirmed intent; never adjust the old tuple in place.
- Contain programming/binding defects before RTK logging/serialization. Map
  known safe failures to executable sign-in, recheck, exact replay or leave
  actions. No raw cause or problem detail reaches Redux or presentation.
- A valid receipt is historical feedback, not current ownership. Close the old
  selection, reset traversal and reread current assignments. Success invalidates
  other subscribed discovery/detail/candidate projections. Nothing persists
  across reloads, enters URL state or sends a notification.

## Consequences

The Console gains one real supervision mutation without inventing execution
controls. Older servers remain usable for inspection, but cannot offer handover.
Backend readers must all be upgraded before its disabled-by-default handover
flag is enabled. After durable transfers, old original-assignee backend readers
cannot safely serve traffic or be restored as rollback.

Navigating away may discard local replay intent but does not cancel a sent
server-side effect. Real current authority and ownership are always server
decisions; no continuous revocation guarantee is introduced. Recipient IDs are
not friendly names, and forced recovery for departed supervisors is absent.

Protocol/cache/component tests verify exact attribution, support omission,
deadline/cancellation, safe defects, fresh disclosure, confirmation, hide-before-
POST ordering, explicit replay and callback retirement. Chromium and the eighth
executable guide chapter prove modal keyboard/inert behavior, narrow reflow,
stale/uncertain recovery and synthetic recipient discovery. Simulated responses
and session switches do not verify live OIDC or PostgreSQL browser deployment.

## Alternatives considered

- Automatic retry or optimistic owner replacement: conflates unavailable
  responses with failed effects and bypasses current server truth.
- Reuse a changed command ID/revision on retry: can create an unintended new
  transfer after the original already committed.
- Local copies of run/candidate responses: introduce competing caches and
  preserve identities across failed access checks.
- Feature-owned modal DOM mechanics or raw Effect runners in event handlers:
  violate existing interaction and execution ownership.
- Add an application package or a fake lease countdown: no current executable
  client policy or enforced runtime lease requires those abstractions.

The form dependency and integration follow the
[React Hook Form public API](https://github.com/react-hook-form/react-hook-form).
The backend owns transfer authority, durable audit and rollout; no UI setting
can enable or bypass those boundaries.
