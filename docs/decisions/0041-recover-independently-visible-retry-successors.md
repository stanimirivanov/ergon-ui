# ADR 0041: Recover independently visible retry successors

- Status: Accepted
- Date: 2026-10-20
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Recover a direct successor explicitly, then navigate through fresh independent
access. A relationship is neither a command receipt nor transferable authority.

## Context

Merged Ergon PR #176/backend ADR 0059 adds a current-supervisor retry-successor
read after lost acknowledgement or a later visit. Both runs require independent
current authority; terminal runs and trusted-assigned internal retries qualify.
The existing Console can inspect a predecessor but cannot recover this link.

## Decision

- Existing run-supervision data access owns strict decoding, bounded Effect
  HTTP, safe failures and private RTK observations. Feature owns lookup/focus
  intent, neutral wording and related selection. App/ui-web retain shell/panes
  and primitives. No package, application core, dependency or separate cache is added.
- Look up explicitly under a ready Console, keyed by tenant/source/expected
  epoch. Opening and rechecking require distinct protected reads; closing
  retires only this subscriber. No target preload, CSRF, control acquisition,
  command or polling occurs. Parent withdrawal retires the lookup completely.
- Decode exact source epoch, safe independent target epoch, UUIDs and UTC
  precision. Reject self-links and malformed data; strip all private extras.
  The expected source epoch is local, never a server-selected parameter. A
  target epoch need not match or precede the source, nor remain unchanged
  before a subsequent independently authorized detail read.
- Null means no currently visible successor. No retry, unassigned target and
  inaccessible target stay indistinguishable; infer no retry budget or absent
  history. Unknown missing routes mean unsupported, not successful null. Known
  private denial remains neutral. No internal fallback exists.
- Pending lookup hides prior coordinates. Failed protected lookup withdraws
  the earlier workspace before paint through the shared inspection-access
  barrier, also consumed by admission history. Safe failure/resource feedback
  survives, never a copied remote response. Explicit recovery reopens fresh
  discovery and exact source gates before another lookup.
- Following retains only target identity plus one originating identity and
  retires earlier facts before I/O. Opening and returning each use the existing
  fresh exact-run gate, including terminal work outside active discovery.
  Discovery/relationships/receipts do not authorize that read. Ordinary
  selection, close, reset and tenant replacement discard the return intent.
- Keyboard focus moves to the inline observation when opened, stays on its
  persistent toggle when closed, and reaches the persistent execution heading
  before context retirement. No modal, focus timer or layout ownership moves
  into data access. Responsive content uses existing tokens and wraps IDs.

## Consequences

Supervisors can recover useful navigation without command replay or inherited
access. Denied target/return navigation remains possible after a successful
lookup; authority is observation-time, not continuous or an atomic cross-query
snapshot. Full graphs, arbitrary terminal discovery and new retry policy remain
out of scope. Deploy the backend first; rollback removes only presentation.

Protocol/cache/feature tests and the twentieth simulated guide cover the
behavior and its boundaries. Synthetic records and browser counters do not
certify live authorization, PostgreSQL durability, provider effects or IdP setup.
Generated media remains ignored and must be visually reviewed before sharing.

## Alternatives considered

- Preload or infer successors from active discovery: excludes terminal work and
  substitutes discovery for a protected relationship read.
- Navigate from an old receipt or restore source/target snapshots: retains
  historical facts as current authority and does not recover after lost intent.
- Render a full retry graph or acquire control for reads: expands approved
  disclosure/command scope without facts or policy supporting it.
- Add another application core/cache or duplicate the failed-read barrier:
  rejected; existing consumed owners already provide the required lifetimes.
