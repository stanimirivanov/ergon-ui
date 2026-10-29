# ADR 0058: Review exact documentary proposals

- Status: Accepted
- Date: 2026-10-29
- Milestone: M06 - Evidence Compiler

## TL;DR

Add an isolated evidence workbench route consuming the merged backend review
contract. Plain-text citations remain private, review intent stays immutable, and
uncertain writes require explicit exact replay. Acceptance grants no authority.

## Context

M06-PR9 needs pending discovery and claim/procedure review before contradiction
and bundle UI. Backend PR #250 supplies bounded keyset discovery, exact verified
inspection and immutable terminal review. There is no source catalog endpoint;
browsing here means pending proposals and their source citations, not uploads.

## Decision

Use evidence/model for neutral values and rationale refinement, evidence/data-access-web
for Effect-based strict protocol decoding/HTTP and RTK Query, and evidence/feature-web
for React presentation and RHF form state. The workbench owns route, session,
isolated store, private transport binding, cursor/selection and scope replacement.
No client use-case layer or new external runtime dependency is needed.

The route is /tenants/:tenantId/evidence. Only the tenant enters the URL.
Keyset cursors and proposal selections stay local. Each queue page, selected
inspection and explicit recheck creates a fresh session-verified disclosure scope.
Unsubscribe before aborting queries/mutations and resetting caches; departure,
tenant/session replacement and sign-out retire old handles. Late acknowledgements
cannot reopen retired presentation. Reuse ADR 0057's private transport.

Decode bounded queue metadata, exact identity/extraction/compiler, status/version
parity, typed claim values/validity, ordered step quotations and API citations.
Microsecond validity and cursor strings remain exact. Render all source markup,
links and API descriptions as inert text. Strip authority-proof identifiers,
unknown fields and diagnostics before RTK serialization. Requests use same-origin
credentials, no-store, five-second invocation budgets and a two-MiB response cap;
reads and writes have no automatic retries.

Only a fresh PROPOSED version-zero inspection offers acceptance/rejection.
RHF owns rationale/decision drafts. Submission captures one command UUID and exact
extraction/version/decision/rationale, commits quotation withdrawal and retires its
inspection subscription before I/O. Every explicit write obtains fresh CSRF.
Transport, timeout, malformed acknowledgement or server failure may mean admission
already occurred: retain only mounted immutable intent for an explicit exact retry.
Conflict/denial requires rechecking; do not alter or automatically resubmit intent.
Success reacquires the selected proposal through a fresh session/inspection scope.
A terminal status and original receipt are history, not execution permission.

The persistent route heading receives focus before replacing private content.
Use semantic labels, native form controls, visible keyboard focus and wrapping text
at narrow widths. No animations, raw HTML, external reference fetches, browser
storage, lease operations, contradictions or bundles are introduced.

## Consequences

The new inward edges follow existing capability/type/platform rules. Scope policy
adds evidence only to itself, workbench and browser tests; requester stays isolated.
Nx references and workspace links include the three used projects.

Selection requires a visible pending entry; no guessed direct proposal deep link,
upload, rich source renderer or general source catalog is supplied. Quote inspection
does not prove operational truth. Session authorization is a point-in-time check;
the backend reauthorizes all reads, writes and receipt recovery. Browser simulations
prove UI/protocol behavior, not live OIDC, PostgreSQL authority or CSRF enforcement.

Deploy the merged backend review migration/API before exposing this route. Rollback
removes UI exposure while retaining backend immutable audit history. Existing
workbench navigation gains a link; Console layout is otherwise unchanged.

## Alternatives considered

A shared long-lived store would retain private source content across route scopes.
A second React resource cache would duplicate RTK ownership. An application package
would be pass-through without independent client policy. Automatic retry or deriving
authority from an earlier receipt could apply stale or unintended review. Rich
Markdown rendering adds an unnecessary untrusted-content boundary.
