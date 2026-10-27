# ADR 0054: Create requester cases with exact recovery

- Status: Accepted
- Date: 2026-10-27
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Add session-gated requester intake as its own data-access/feature capability.
Preserve raw command intent after uncertainty; acknowledgement only links to
independently fresh progress. No durable browser queue or automatic run.

## Context

Merged Ergon PR #220 supplies authenticated intake over atomic opening/ownership.
The current requester packages own existing-case progress/history/answers, not
creation before a case resource exists. Intake needs a distinct mutation, input
validation and lifetime without broadening or coupling those resource owners.

## Decision

Add `requester-intake/data-access-web` and `requester-intake/feature-web`. The app
composes their real consumers at `/tenants/:tenantId/new`, reached from the verified
tenant home. It owns session gating, route/store replacement and trusted links.
Intake imports only itself/shared UI; no progress, session or resolver imports.
No interface-only application core or generic command framework.

Data access owns Kotlin-compatible trimming/UTF-16 input bounds, invocation-local
CSRF, one bounded POST without automatic retry and exact 200/201 receipt checks.
Only case acknowledgement identity reaches the cache/feature; original receipt
text/timestamps never become current state. RTK contains defects before framework
serialization/logging. A CSRF-stage problem cannot reject an intake command.

The feature owns RHF draft/review/errors and mounted immutable UUID/raw-input
intent. Submission commits draft withdrawal and heading focus before I/O. Only
initial known input rejection allows correction; a later rejection during
recovery never unseals a possibly committed intent. Explicit replay preserves
all coordinates/text, with fresh CSRF. Auth/denial/conflict offers no bypass.
StrictMode must not duplicate writes. Tenant/route/session retirement aborts and
resets owned observation, retires validation/callbacks and loses local recovery,
not a committed server write. No browser persistence.

After acknowledgement, the app-supplied link starts an independent requester
route/session/progress/history lifetime. No automatic navigation, progress cache
insertion, run start, discovery, approval or proof. Input is always untrusted text.

## Consequences

Two consumed Nx projects and explicit app/test edges keep intake cohesive without
changing existing progress contracts. The existing pinned dependencies gain only
workspace bindings. Deploy backend #220 first; UI rollback removes intake without
deleting immutable cases/bindings. Login still returns only to the tenant entry;
no draft, case intent or deep link is persisted to restore navigation.

The executable guide uses synthetic exact-route fixtures and demonstrates lost
acknowledgement, identical replay and independently checked progress. Local
formatting/lint/type/build and focused tests precede delivery; full browser,
visual and video-book gates run on CI on this busy host. Those deferred checks
are not passing evidence, nor do fixtures certify live OIDC/PostgreSQL behavior.

## Alternatives considered

Broadening requester-progress couples creation to an existing resource and its
dependencies. A shared command framework hides different normalization/recovery
policies; no abstraction is justified by this slice. A new application core adds
no platform-neutral client policy. Automatic retries/replacement UUIDs risk
duplicate cases; persisting private intent changes the privacy/retention model.
