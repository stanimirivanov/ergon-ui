# ADR 0060: Inspect historical evaluations

- Status: Accepted
- Date: 2026-10-31
- Milestone: M07 - Simulation and evaluation

## TL;DR

Add a read-only Simulation Lab using the merged PR12 browser projection. Historical
simulation results never confer current execution or promotion authority.

## Context

M07-PR13 needs bounded evaluation discovery and exact reports. Backend PR #284
supplies GET history/report APIs, with independently revocable EVALUATION_VIEWER
checks. Resolver registration and tenant navigation do not imply that entitlement.
Promotion confirmation belongs to the following slice.

## Decision

Add evaluation/model for neutral report values and budget coherence;
evaluation/data-access-web for wire schemas, Effect transport and RTK Query;
evaluation/feature-web for presentation. Workbench owns the lazy route
`/tenants/:tenantId/simulation`, session resolution and an isolated private store.
No pass-through application project or external dependency is introduced.
The app depends on all three; feature depends on model, data access and shared UI;
data access depends on model. Extend explicit architecture scope rules accordingly.

GET `/bff/v1/tenants/{tenant}/simulation-lab/reports?limit=20&after={id}`
returns newest-first keyset pages. GET the same base plus `/{reportId}` returns
an exact report. Only a tenant appears in navigation history. Cursor and report
selection remain ephemeral local state. Actor scopes the cache but is never sent
as authority. No polling, mutation, telemetry, browser storage or raw HTML.

Every recheck, selection and page change withdraws subscribers, aborts handles,
resets the isolated cache, focuses the persistent heading and reacquires the
session. Tenant/route departure and the existing local sign-out boundary retire
the view. Late responses cannot restore a retired scope. Pending or failed reads
outrank old data. Authorization is checked per server request; this UI does not
claim instantaneous revocation after a response has been rendered.

Use the established same-origin/no-store GET transport with a five-second budget
including body decoding, a two-MiB bound and no automatic retries. Decode a narrow
projection and strip extra fields before caching. Reject wrong IDs, duplicates,
reordered/oversized pages, invalid cursors, unsupported statuses, malformed dates,
digests and contradictory budget states. A 404 is unavailable access/resource,
not an empty history. Authentication renewal is offered only for the typed BFF
401 contract. Raw diagnostics are discarded.

Show PASS/FAIL/ERROR/UNSUPPORTED with required/optional assertion labels and typed
explanations. Provenance means the exact fixture/evaluator/assertion references and
server-reported report digest, not raw observations or actor metadata. The UI does
not independently hash canonical report bytes. Cost uses integer currency nanos
(billionths); latency uses simulated nanoseconds, never wall time. Missing budgets,
unknown measurements and zero remain distinct. To avoid silent JSON rounding,
budget integers beyond Number.MAX_SAFE_INTEGER fail closed; full signed-64-bit
browser projection support remains a documented limitation.

## Consequences

History pages are independently checked, not a consistent snapshot of all reports.
Failure is distinct from no results. All backend text remains inert and wraps at
narrow widths. Keyboard navigation and persistent heading focus require no modal
or additional interaction framework.

Deploy backend PR12 before this UI. Rollback removes the route without changing
immutable reports or browser data. Promotion, fixture editing, authoring and
live-model comparison remain outside this slice. Run focused package tests,
workbench lifetime tests, the Simulation Lab Playwright scenarios, `pnpm verify`
and the pinned visual gate; report unavailable checks honestly.

## Alternatives considered

Embedding reports in the resolver console would mix distinct authority and cache
lifetimes. A shared application layer would only forward reads. Raw report JSON
would expose fields outside the browser projection. These alternatives are not
used; the narrow evaluation capability follows the existing notification and
evidence composition patterns.
