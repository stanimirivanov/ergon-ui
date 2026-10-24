# ADR 0046: Confirm terminal follow-up completion

- Status: Accepted
- Date: 2026-10-24
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Confirm administrative retirement of one owned follow-up, hide private context
before sending and recover uncertainty only with the original immutable intent.
Completion is neither case resolution nor outcome proof.

## Context

Merged Ergon PR #192 and backend ADR 0066 provide a default-off completion
command over terminal follow-up guards. First execution requires the current
owner, exact claim/revision and current resolver authority. Exact historical
replay remains available to the original actor with current resolver authority
after retirement. Terminal work no longer grants private case or notes access.

## Decision

- Model owns the inert historical receipt; data access owns typed commands,
  exact UUID/positive safe odd revision and UTC receipt validation, Effect,
  safe failures and the RTK mutation. Reuse the existing synchronized
  session-CSRF lifetime. No automatic POST retry or terminal resource synthesis.
- Feature owns an RHF acknowledgement and one discriminated ownership-command
  controller shared with handover. This is consolidation of two concrete
  lifetimes, not a reusable command framework. Capture command UUID, tenant,
  work item, original claim and expected revision only on confirmed submission.
- Commit private withdrawal before I/O. Pending, uncertain and historical
  feedback never reopen case, claim or notes. Every outcome invalidates inbox,
  owned work and exact context/notes observations. Explicit fresh owned-list
  recovery precedes independently authorized context acquisition.
- Exact replay retains the entire original tuple. Definite failures require
  fresh recovery; uncertainty permits explicit replay. StrictMode reattaches
  without another POST. Close, tenant replacement and unmount retire browser
  requests, callbacks and local intent; cancellation does not prove no commit.
- Preserve the shell and persistent Back focus during withdrawal. Existing
  ui-web modal owns geometry, keyboard containment and trigger focus return.
  No URL/storage recovery, application core, dependency or Nx project is added.

## Consequences

Resolvers can end administrative work without claiming case closure, successful
execution or verified resolution. A historical receipt cannot grant continuing
owner access. There is no reopen, undo, administrator override or bulk operation.

Deploy the compatible backend schema and terminal guards before this client,
then enable ERGON_HUMAN_FOLLOW_UP_COMPLETION_ENABLED according to operator policy.
Disabling also disables receipt recovery. UI rollback removes the interaction
but cannot undo sent commands or remove terminal guards from the backend.

Protocol/cache/component tests cover safe failures, exact replay, withdrawal,
StrictMode and late callbacks. The simulated guide and pinned Linux visuals
exercise the confirmation and terminal recovery at desktop and narrow widths.
They do not certify live OIDC, backend locking or production enablement.

## Alternatives considered

- Label completion as case resolution: rejected; the facts and authority differ.
- Duplicate the handover hook: rejected; the same disclosure, cancellation and
  recovery lifecycle would acquire divergent fixes.
- Reopen private context from a receipt or replace revision on replay: rejected;
  neither is a fresh authorization observation or the original confirmed intent.
- Add persistent replay or a generic workflow engine: rejected; not needed by
  this bounded mounted interaction.
