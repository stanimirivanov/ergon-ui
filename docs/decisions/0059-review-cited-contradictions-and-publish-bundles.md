# ADR 0059: Review cited contradictions and publish bundles

- Status: Accepted
- Date: 2026-10-30
- Milestone: M06 - Evidence Compiler

## TL;DR

Extend the existing evidence workbench with exact cited assessments, immutable
adjudication and bundle publication/inspection. Reuse private session scopes,
strict transport decoding and explicit exact replay. No documentary result is
operational truth, permission or outcome proof.

## Context

M06-PR11 consumes merged backend PRs #252 and #254 after proposal review in
ADR 0058. The browser contracts expose complete bounded assessments by accepted
anchor claim, decisions by exact ID, and immutable bundle manifests by ID. There
is no catalog of accepted claims, adjudications or bundles. Later evidence can
make an adjudication historical without rewriting its assessed snapshot.

## Decision

Extend evidence/model with neutral assessment, adjudication, manifest and exact
intent types. Evidence/data-access-web owns Effect HTTP execution, runtime wire
schemas, relationship refinements and RTK Query resources. Evidence/feature-web
owns cited comparison, RHF forms and mounted write phases. Workbench retains
route, private transport, session verification, target navigation, scoped store
replacement and persistent-heading focus. No new package, application layer,
external dependency or dependency edge is introduced.

At the existing evidence route, users choose the pending queue, contradictions
or bundles. Only the tenant enters the URL. Exact supplied anchor, adjudication
and bundle IDs remain mounted navigation context, never authority or browser
storage. Each selection or recheck unmounts private subscribers, aborts owned
requests, resets the isolated cache and reacquires a verified session. Pending
or failed reads outrank retained data. Route/session/tenant departure retires
presentation and callbacks; late acknowledgements cannot navigate a new scope.

Assessments show every accepted alternative side by side at wide widths and
stack at narrow widths. Display exact source digest, extraction/compiler, review
command, claim value, validity, code-point quotation and every canonical pair
finding. Validate complete pair ordering and conservative v1 semantics at the
boundary, preserving microsecond intervals. Unknown validity is explicit even
for a singleton. No detected conflict does not establish consistency.

Only conflict or undetermined assessments offer preference/defer adjudication.
Selection, complete candidate IDs, expected revision, rationale and one UUID
are captured as immutable intent. Backend policy decides admissibility. Current
and historical decisions display reviewer/time, preference/defer and original
assessment; opening a current assessment is always an independent read.

Bundle composition selects from one complete assessed key with optional accepted
procedure IDs, or procedures alone. Known validity and determined findings are
required. A conflicting set exposes only the preferred claim from the explicitly
opened current preference decision. Deferred, unknown and historical inputs do
not offer conflicting publication. The backend atomically rechecks acceptance,
complete sets, source attribution, adjudication and fresh authority. Multi-key
composition remains supported by the backend, outside this UI's bounded composer.

Writes obtain invocation-local CSRF, commit withdrawal of quotes and forms before
I/O, and use the existing no-store, same-origin five-second/two-MiB transport.
No automatic retry. Uncertain transport, timeout, malformed response or server
failure keeps only mounted exact intent for an explicit replay. Stale/denied or
invalid commands withdraw evidence and require recheck; never mint a replacement
from a changed assessment. Retire RHF validation callbacks with their form.

Successful commands navigate through a new private scope to an independent exact
receipt/manifest read, rather than rendering a mutation result as current truth.
Strip authority-proof IDs and unknown diagnostics before cache serialization.
Bundle decoding verifies tenant/schema/identity, canonical ordering, selected
bounds, proposal/source membership, complete claim-set coverage, review links,
cutoff order and exact intent correspondence. The displayed SHA-256 is explicitly
server-reported; this slice does not download canonical bytes or claim independent
cryptographic verification.

## Consequences

All quotations and labels remain inert text. Native labeled controls, persistent
heading focus, status announcements, keyboard actions and wrapping/reflow preserve
accessibility. No new Console layout, requester behavior, source upload, catalogs,
contract authoring, operational facts, promotion or execution is introduced.

Deploy the backend contradiction/bundle migrations and browser APIs before this
UI. An absent route fails closed. UI rollback removes access to these views while
preserving backend immutable records; no browser data migration is needed.
Browser tests simulate API responses and prove UI protocol/lifecycle behavior;
they do not establish live PostgreSQL, OIDC or CSRF authorization. Existing pinned
visual comparison remains a separate renderer-dependent gate.

## Alternatives considered

A guessed catalog or implicit latest selection would invent a backend contract.
A multi-key editor adds discovery and composition complexity beyond the first
review surface. Automatic preference or treating a historical receipt as current
would hide uncertainty. A long-lived cache, browser-persisted intent or automatic
mutation replay would cross the established private disclosure boundary.
