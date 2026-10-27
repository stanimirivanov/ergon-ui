# ADR 0053: Record requester answers with exact recovery

- Status: Accepted
- Date: 2026-10-27
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Submit one final answer using requester-session CSRF. Preserve exact intent after
uncertainty, replay only explicitly, and independently reacquire progress/history
after acknowledgement. No receipt grants continuing access or becomes history.

## Context

Merged Ergon PR #216 supplies protected answers and exact recovery. PR22b gates
requester progress and history together. PR22c adds writes without importing the
resolver audience, weakening fresh disclosure, or creating a client-side authority.

## Decision

The existing requester data-access package owns answer contracts, Effect HTTP and
RTK mutation containment. The app's existing factory supplies both read and write
capabilities; read-only injected clients remain valid for reads. A missing write
binding fails as a contained defect. No new dependency edge or package is needed.

Every explicit invocation obtains a fresh invocation-local CSRF token, then sends
at most one POST within a five-second budget. No automatic retry occurs, including
CSRF setup. Only a matching 200/201 receipt acknowledges the original response
UUID, question, case and exact Unicode text. Validate timestamps and strip unknown
fields; expose only acknowledgement identity. Problems become diagnostic-free
typed outcomes. Cancellation cannot undo a server write or mask a concurrent defect.

The feature owns selected question identity, RHF draft/errors, and mounted immutable
command intent. Explicit null coverage on an OPEN snapshot offers a form; omitted
coverage, recorded answers and closed snapshots do not. These are affordances,
not authorization. Only the backend may authorize creation or exact recovery.

Submission focuses the persistent heading and commits private-canvas withdrawal
before CSRF/POST I/O. StrictMode must not duplicate a command. Uncertainty, CSRF
rejection or contained defects allow explicit identical replay, never replacement
UUIDs/text. Only an initial invalid-answer rejection allows RHF correction and a
reviewed new intent. A later rejection during recovery never proves that an earlier
unobserved write did not happen: intent stays sealed, and fresh history/operator
assistance is offered instead of editing. CSRF-stage problems cannot classify an
answer as rejected; command-specific errors are meaningful only from the POST.
Authentication, neutral absence and conflict do not offer replay. Pending/failed
fresh reads and a closed snapshot also withhold the replay control while retaining
intent; only an available OPEN observation can offer it again. A deliberate
recheck may disclose separately fresh resources but cannot replace retained uncertain
intent or turn an acknowledgement into current facts. Acknowledgement automatically
starts the existing fresh progress/history gate; read failure keeps private facts hidden.

Unmount/replacement retires draft validation, command observation and owned handles;
no late callback reacquires resources. Recovery intent is memory-only and lost on
navigation, not persisted or represented as an undo guarantee. Mutation records are
reset after settlement. Historical feedback contains no receipt text or timestamps.

## Consequences

Deploy the merged backend first. No migration, new external library/version or
server contract changes. The feature adds its own binding to the existing pinned
React Hook Form dependency; the generated lockfile records that importer edge.
BREAKING (source-only, pre-release): typed `ProgressDependencies` bindings now require
the answer port as well as reads. The existing factory already supplies both;
the separate `ProgressClient` read interface and HTTP GET contracts are unchanged.
UI rollback removes controls without deleting immutable answers. Answering is not
delivery, consent, evidence ingestion, approval or proof. Unsupported history remains
readable without offering writes. No polling, edit, upload or replacement workflow.

Tests cover exact receipt binding, no hidden retry, CSRF, defects, Unicode, withdrawal,
late callbacks, closure, focus, reflow and independent history. The assertion-backed
guide demonstrates simulated uncertain recovery; live IdP/PostgreSQL behavior remains
the backend/operational gate.

## Alternatives considered

- Reuse resolver contracts or CSRF state: rejected; audiences and lifetimes differ.
- Automatically retry or mint a replacement UUID: rejected; an unobserved write may exist.
- Insert the receipt into history: rejected; historical acknowledgement is not a fresh read.
- Add an application package or persistent command queue: rejected; this mounted feature
  needs neither cross-platform workflow policy nor durable background execution.
