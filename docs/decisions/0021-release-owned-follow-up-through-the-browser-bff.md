# ADR 0021: Release owned follow-up through the browser BFF

- Status: Accepted
- Date: 2026-10-03
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Let a resolver confirm release of an exact active claim through the CSRF-protected
BFF. Close its case disclosure before submission, verify the release receipt,
and refresh server-owned work and case-context caches.

## Context

ADR 0020 made later claiming possible, but the workbench could not initiate a
release. The backend's additive release contract accepts the active claim ID
and expected ownership revision, returns an exact-replay receipt, and is
disabled by default during rollout. Releasing changes current ownership, not
case completion. A cached case disclosure or owned-work page must not imply
continuing authority after release.

## Decision

- The owned-work feature requires an explicit confirmation that release returns
  work to its original shared queue without completing the case. Close any open
  case disclosure before the mutation begins.
- Web data access sends the exact claim ID and row revision through the
  same-origin BFF with the existing in-memory session CSRF token. It decodes
  both new and replayed receipts and verifies claim, work-item, and next even
  revision before accepting success. Actor and authority IDs never enter the
  browser request.
- Never automatically retry the release POST. An explicit retry after an
  uncertain result preserves the same claim ID and expected revision.
- Successful release invalidates tenant inbox and owned-work pages plus the
  released item's case context. Missing or stale ownership refreshes owned
  work and case context, without revealing another owner. A disabled-release
  response explains the rollout state and offers no immediate retry.
- The deployment flag remains operator-owned. The UI does not enable release
  remotely or treat a displayed revision as authority.

## Consequences

Resolvers can return still-open work to the shared queue without destroying
claim history. The browser depends on the upgraded release route; an older BFF
fails closed. Confirmation adds one interaction step. A command awaiting an
explicit retry exists only in mounted component state, not across reloads.
The BFF must be enabled only after upgraded ownership readers are deployed;
this UI change does not alter server rollout configuration.

## Alternatives considered

Automatically retrying every release would hide an uncertain mutation outcome.
Optimistically removing the card would reconstruct server keyset pages and
could leave cached case evidence visible. Placing CSRF or command data in Redux
would expand sensitive state lifetime without improving recovery.
