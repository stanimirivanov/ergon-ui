# ADR 0020: Use revision-checked browser claim commands

- Status: Accepted
- Date: 2026-10-02
- Milestone: M05 - Human follow-up and resolver console
- Supersedes: [ADR 0005](0005-claim-follow-up-with-ephemeral-csrf-tokens.md)

## TL;DR

Claim shared-inbox work through the BFF's revision-checked command route. A
fresh command ID and the visible ownership revision identify one intent;
explicit retry after an uncertain outcome resends that exact intent.

## Context

ADR 0005 selected the original `/claims` route and relied on same-resolver
replay. That route is first-cycle-only and cannot claim work returned to the
inbox after a release. The BFF now exposes the current ownership revision on
inbox and owned rows and supports a command-ID-bound claim receipt. Browser
responses and concurrent ownership may change independently of the displayed
row. The browser cannot infer a newer revision or whether an ambiguous POST
was recorded.

## Decision

- Decode each inbox row's non-negative, even ownership revision before caching
  it. Decode each owned row's positive, odd revision and claim/work-item pair.
- On a new user claim action, create a UUID command ID and submit the row's
  revision to `/claim-commands` with same-origin credentials and the
  session-bound CSRF token. Do not send actor or authority identifiers.
- Decode the command receipt and match its echoed command ID, resulting
  revision, and claim work-item ID to the submitted intent before caching its
  claim. A mismatch is an invalid response.
- Never automatically retry the claim POST. An explicit retry after an
  ambiguous transport, timeout, or response failure resends the same command
  ID and expected revision. A new click on refreshed work is a new intent.
- Map stale revisions and reused-command conflicts to distinct typed failures.
  Refresh tenant inbox pages after success, stale revision, absence, or legacy
  already-claimed conflict; success also refreshes owned pages. Keep the CSRF
  token in the HTTP client only, with the existing single-flight acquisition
  and invalid-token replacement policy.

## Consequences

The workbench can claim work after release while preserving replay safety for
an uncertain result. It requires the upgraded BFF response shape; older BFF
versions fail closed as invalid responses. Command IDs survive an explicit
retry within the current mounted UI state, not a page reload. The server
remains authoritative for actor, tenant, current resolver authority, and
ownership. A release action is separate future work.

## Alternatives considered

Keeping `/claims` would strand released work. Generating a new command ID for
each retry could convert an uncertain success into a misleading conflict.
Automatic POST retry would hide ambiguous state from the resolver. Optimistic
inbox edits would need to reconstruct server keyset ordering and cannot prove
current ownership.
