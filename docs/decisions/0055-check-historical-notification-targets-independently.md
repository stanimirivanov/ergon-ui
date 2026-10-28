# ADR 0055: Check historical notification targets independently

- Status: Accepted
- Date: 2026-10-28
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Compose bounded historical notifications in both apps. Every recheck or target
open creates a fresh verified-session lifetime. Delivery metadata grants no
current access, claim, acknowledgement or command authority.

## Context

Ergon PR #226 provides audience-bound protected feeds after durable delivery
foundations. The requester and resolver use different identity deployments and
target protocols. Reusing a queue's retained summary, inserting delivery data
into a case cache or treating an alert as current ownership would bypass those
boundaries. Login currently allows only canonical tenant return paths.

## Decision

Add consumed `notifications/data-access-web` and `notifications/feature-web`
projects. They import only their own capability and shared UI. Data access owns
the fixed same-origin GET, bounded Effect execution, safe failures and RTK cache.
Feature owns semantic historical cards, explicit recheck/open intent and distinct
loading, failure, truncated and checked-empty presentation. Neither imports
session, follow-up or requester progress. No application core or dependency
version is added for server-authoritative reads.

Each app composes `/tenants/:tenantId/notifications`, session verification and
target navigation. The page owns a persistent focus heading and replaces its
private store/provider on recheck or target selection. It aborts running handles
and resets retired caches; unmount cleanup tolerates React effect replay. Only
fresh currentData may disclose content. Pending or failed reads hide old rows.
No browser storage, background polling, acknowledgement or read flag is added.

Requester targets enter the existing supplied-case route and independently
check session, progress and history. Resolver selection stays in mounted app
state, outside URL/history; a distinct current-owner summary read accepts a work
pointer, validates the complete existing model and correlates that work ID.
Existing queue reads still require their full case/run/work tuple. The feature
reuses read-only summary presentation without claim or execution controls.

Decode only documented metadata and strip unknown fields before cache admission.
Require audience/event/target coherence, UUID identities, valid UTC instants,
at most fifty rows and coherent truncation. Reject duplicate composite
kind/source/target identities and non-descending backend order, preserving
nanosecond precision. The feed makes one five-second invocation with no automatic
retry; target reads retain their existing classified retry semantics. Unexpected
dependency defects become closed safe values before Redux serialization.

Authentication failures offer the trusted `/bff/login` link returning only to the
tenant entry, never a URL from problem details or a remembered private selection.
Historical targets remain historical even when the fresh read denies access.

## Consequences

Deploy backend PR #226 first on the correctly configured audience origin.
Rollback removes UI entry points without deleting durable deliveries. Bounded
history is not a complete queue, question inventory, unread count or audit of
current access. Two executable synthetic guide chapters document both audiences
and negative recovery; they do not certify live OIDC or PostgreSQL enforcement.
Local compilation, lint, formatting and focused units precede delivery. Heavy
browser, visual and video-book gates remain CI work and must be reported pending.

## Alternatives considered

Coupling notifications to a target capability would grant it unrelated imports
and hide the app's authority transition. A global cache or receipt-seeded target
would retain stale evidence. Encoding resolver work IDs in new routes would
broaden existing private navigation policy. Push transport, read marking and
generic notification/action frameworks add unsupported contracts and are deferred.
