# ADR 0023: Consume assigned-run Console snapshots

- Status: Accepted
- Date: 2026-10-09
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Add an independently owned run-supervision capability for the reviewed
assigned-only BFF. Render recorded snapshots, not simulated execution stages.
Hide private detail during pending or failed revalidation; never equate an
assignment with a lease, approval, or human follow-up claim.

## Context

The existing Console is authorized by an exact owned follow-up claim and can
inspect an escalated run only. Ergon core now separately records an immutable
initial supervisor assignment and exposes assigned active-run discovery and
Console detail. A verified actor is necessary, but only the BFF can establish
current resolver authority and assignment. Its first projection includes the
pinned start and current state, not case evidence, ordered events, measured
spans, approval decisions, or outcome-proof checks.

## Decision

- Add `run-supervision/data-access-web` for wire decoding, typed failures,
  Effect execution, and RTK Query. Add `run-supervision/feature-web` for
  discovery, local selection, responsive presentation, and recovery behavior.
  No model or application project is justified by this cache-centric slice.
  Enforce scope isolation from session and follow-up; the app composes these
  capabilities and supplies a display-only verified-actor slot.
- Use only same-origin confidential-BFF GETs at
  `/bff/v1/tenants/{tenantId}/resolution-runs/assigned` and
  `/bff/v1/tenants/{tenantId}/resolution-runs/{runId}/console`. The browser never
  calls the machine assignment command or assigns itself. The backend must be
  deployed and a trusted integration must record assignments before useful
  discovery is possible.
- Keep the two-part keyset cursor intact. Discovery is a best-effort current
  active set, not an authority decision or historical snapshot. Detail is
  tenant/run keyed, checks the requested run identity, and may disclose terminal
  state under the same server gate. Falling out of the active list alone does
  not close an already selected, still-authorized terminal detail.
- Store only the non-sensitive `view=runs` choice in the tenant URL. Run
  selection and pagination are local React state; switching capability or
  tenant discards them. Detail has zero unused-cache grace and revalidates on
  mount. Suppress retained private detail while discovery or detail rechecks
  are pending or fail. The non-disclosing `404` never explains whether the run
  exists, is assigned elsewhere, or current authority has expired.
- Offer explicit recheck, not automatic polling or a claim of live monitoring.
  Bound transport retries for transient reads; never retry malformed payloads,
  protected absence, or authority failures automatically. Keep credentials,
  raw error causes, and provider identities out of cache/persistent storage.
- Use the approved dark three-pane visual direction with semantic tokens and
  accessible narrow reflow. Display the pinned step, capability, risk, approval
  requirement, revisions, and server-recorded state. Label evidence and proof
  detail as unavailable in this projection. Do not fabricate a DAG, spans,
  latency/cost, lease countdown, approval actions, or verified claim nodes.

## Consequences

Resolvers can inspect assigned active runs without widening follow-up
disclosure or putting presentation into infrastructure. Sensitive snapshots
cannot reappear through retained cache after a failed explicit check. A
terminal state is server-recorded, not independently verified by the browser.
Explicit recheck adds reads and may show a brief empty/loading work surface.
This does not continuously revoke an open view or implement logout/cache
clearing; the existing session lifetime remains unchanged.

The seventh executable guide uses marked synthetic BFF data, records discovery
and recovery, and explains these limitations. Unit/component and browser tests
cover contract rejection, cancellation, snapshot privacy, pagination, terminal
detail, and keyboard/narrow-layout accessibility. Those fixtures are not proof
of a real OIDC session, trusted machine assignment, or PostgreSQL integration.

## Alternatives considered

Reusing follow-up claims would change their meaning and cannot discover active
runs. Putting supervision into follow-up packages would combine independent
authority relationships and reasons to change. A mandatory application core
would forward server reads without client-owned policy. Rendering the concept
mock with synthetic operational facts would misrepresent unavailable backend
capabilities. Automatic polling would require a separate freshness, cost, and
revocation contract and is not needed for this snapshot slice.
