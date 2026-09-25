# ADR 0007: Render owned follow-up case context

- Status: Accepted
- Date: 2026-09-25
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Lazily render the confidential BFF's case-summary projection inside an owned
follow-up card. RTK Query caches it by tenant and work item, Effect validates
the projection's cross-field invariants, and React renders observation evidence
only as text.

## Context

The owned-work view identifies the case and escalation but does not give the
resolver enough evidence to understand the intervention. Core ADR 0040 exposes
`GET /bff/v1/tenants/{tenantId}/human-follow-ups/{workItemId}/case-summary`.
The endpoint rechecks the signed-in actor's current resolver authority and
ownership, then returns the open case, its pinned resolution contract, the
escalated run, and observations at the run's evidence boundary.

Closure, ownership change, and authority change intentionally share one 404
problem type. Observation content originated outside the UI trust boundary and
must remain inert. The summary is useful only in the context of the active
claim; a durable case route and browser history semantics do not yet exist.

## Decision

- Add an accessible disclosure to each owned-work card and mount its query only
  while expanded. Keep disclosure state local and out of the URL and storage.
- Consume only the confidential BFF projection. Cache it in RTK Query by exact
  tenant and work-item identity; keep Effect responsible for HTTP execution,
  one bounded transient retry, timeout, decoding, and typed failures.
- Reject a successful response unless the requested work item matches, numeric
  versions are positive integers, the case contract matches the run contract,
  the run evidence boundary does not exceed the case stream, and observations
  are strictly ordered within that boundary.
- Present the shared 404 as neutral unavailability. Do not infer closure,
  ownership, or authority from it.
- Render observation summary, content, provider, and reference through React
  text nodes. Do not accept or inject HTML from evidence fields.
- Preserve explicit session-expiry recovery and an explicit retry for transient
  or unsafe responses.

## Consequences

Resolvers can review the evidence and execution metadata behind an escalation
without leaving their active-work list. The query remains subject to server
authority on every cache miss and does not introduce another client cache or a
shareable sensitive selection.

The projection is read-only and intentionally has no deep link. The UI cannot
release, reassign, approve, retry, or resolve the follow-up; each action still
requires a reviewed browser contract and its own PR-sized slice.

## Alternatives considered

- **Create a case-detail route now:** rejected because the current contract is
  subordinate to an owned follow-up and has no durable selection semantics.
- **Preload every summary with the owned page:** rejected because most evidence
  may never be inspected and authority should be checked at disclosure time.
- **Copy the summary into component or Redux slice state:** rejected because
  RTK Query already owns remote caching, cancellation, and request lifecycle.
- **Render rich evidence HTML:** rejected because evidence is untrusted and the
  current product need does not justify a sanitization policy or dependency.
