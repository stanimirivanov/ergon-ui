# ADR 0004: Consume the read-only resolver inbox

- Status: Accepted
- Date: 2026-09-22
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Render the resolver's shared human follow-up inbox from the confidential BFF.
RTK Query owns each validated page, the URL owns the queue filter, and local
component state owns reversible keyset navigation. Claiming work remains out of
scope until a browser mutation and CSRF contract exist.

## Context

The verified browser session introduced by ADR 0003 could identify a tenant
actor but exposed no resolver work. Core ADR 0037 now defines a read-only
`GET /bff/v1/tenants/{tenantId}/human-follow-ups` contract with current
authority filtering, optional queue selection, bounded keyset pagination, and a
browser-specific DTO that excludes provider identity and authority evidence.

The UI must preserve two backend guarantees. Cursor fields form one exact
position and cannot be mixed independently. An actor without current resolver
authority receives an empty page so the browser does not learn whether work
exists in an inaccessible queue.

## Decision

- Consume only the browser BFF resource; do not adapt the broader
  `/internal/v1` follow-up representation for browser use.
- Decode the complete page before it enters Redux. Accept only open work,
  valid UUIDs, UTC instants, lowercase queue keys, and a complete or null
  two-field cursor.
- Keep RTK Query responsible for request lifecycle and page caching. Execute
  same-origin HTTP, timeout, one bounded transient-read retry, decoding, and
  stable problem mapping in an Effect-backed client.
- Request 25 rows per page. Treat the cursor as one immutable value and retain
  prior positions locally so Previous and Next navigation never reconstructs
  cursor fields.
- Store the optional queue key in the `queue` URL parameter. Reject malformed
  URL values before HTTP and reset pagination whenever the filter changes.
- Render an empty successful page as “No open work in this view.” Do not infer
  or display whether the actor lacks authority.
- On session expiry, offer only the fixed local BFF login path with a locally
  built tenant return path. Never render remote problem detail.

## Consequences

Resolvers can inspect current visible follow-up work, filter a shareable view,
and traverse bounded pages without provider credentials or internal API
representations entering browser state. Cached pages remain independent RTK
Query resources and Effect does not introduce a second cache.

The workbench currently shows source, routing, lifecycle, case identity, and
opened time only. It cannot claim, release, resolve, or open a case detail.
Those actions require reviewed BFF mutation contracts, CSRF protection,
conflict semantics, and cache invalidation rules.

## Alternatives considered

- **Accumulate every page in component state:** rejected because it duplicates
  RTK Query's remote state ownership and complicates refresh semantics.
- **Put keyset cursors in the URL:** deferred because cursors are short-lived
  traversal state rather than a stable shareable selection; the queue filter is
  the durable view input.
- **Interpret an empty page as missing authority:** rejected because that would
  undo the backend's deliberate non-disclosure behavior.
- **Add claim controls with the read path:** rejected because no browser-safe
  mutation or CSRF contract exists yet.
