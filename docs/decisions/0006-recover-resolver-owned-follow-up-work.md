# ADR 0006: Recover resolver-owned follow-up work

- Status: Accepted
- Date: 2026-09-25
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Render active claims from the confidential BFF as a separate RTK Query
resource. Effect validates each nested work-item/claim pair, local state keeps
the exact claim cursor reversible, and successful claims invalidate both the
shared inbox and owned-work cache.

## Context

Claiming removes a row from the shared inbox. Core ADR 0039 now exposes
`GET /bff/v1/tenants/{tenantId}/human-follow-ups/owned`, allowing the signed-in
resolver to recover open work they own without provider tokens, actor IDs, or
authority-evidence IDs entering browser code.

The server orders results by claim time and claim ID. Those cursor fields form
one position. An empty page may mean no active claims or missing current
resolver authority, so the UI cannot explain the reason without defeating the
backend's non-disclosure policy.

## Decision

- Consume only the browser-owned BFF resource and decode the complete response
  before RTK Query caches it.
- Reject a nested row when its claim names a different work item. Accept only
  open work, valid UUIDs, UTC instants, queue keys, and a complete or null
  two-field claim cursor.
- Cache owned pages independently by tenant and exact cursor. Keep reversible
  Previous and Next traversal in component-local state rather than copying
  remote resources into Redux or the URL.
- Render owned work before the shared queue so recently acquired work remains
  visible after it leaves discovery.
- Treat an empty page neutrally and do not infer missing authority.
- Invalidate owned pages after a successful claim. Continue invalidating only
  the shared inbox for another-resolver conflict or absence because those
  outcomes do not establish a change to the current resolver's ownership.
- Preserve the existing bounded transient-read retry, session-expiry recovery,
  no-provider-token boundary, and safe failure copy.

## Consequences

Resolvers can recover active claims after reload or navigation, and a newly
successful claim appears from server truth without optimistic repair of two
keyset resources. The browser maintains separate shared and owned caches whose
contracts and invalidation meanings stay explicit.

The view still provides summary and ownership timing only. It cannot open case
detail, release, reassign, or complete work because no reviewed browser
contracts for those behaviors exist yet.

## Alternatives considered

- **Keep a successful claim only in component state:** rejected because it is
  lost on reload and creates a second source of remote truth.
- **Move an item optimistically between lists:** rejected because concurrent
  changes and independent keyset boundaries make client-side page repair
  unreliable.
- **Put claim cursors in the URL:** rejected because they are short-lived page
  traversal state rather than a durable shareable selection.
- **Treat an empty page as missing authority:** rejected because it would undo
  deliberate backend non-disclosure.
