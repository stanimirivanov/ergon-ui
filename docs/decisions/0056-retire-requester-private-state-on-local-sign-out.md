# ADR 0056: Retire requester private state on local sign-out

- Status: Accepted
- Date: 2026-10-28
- Milestone: M03 - Policy and Human Authority

## TL;DR

M05-PR28a adds a complete requester exit over backend PR #228. Confirmation
withdraws the private router tree before fresh CSRF/logout I/O. Failure never
restores that document's private view. Workbench adoption follows in PR28b.

## Context

The backend supplies authenticated, CSRF-protected local retirement, not provider
revocation. Requester routes already have separate stores; workbench still has
module-scoped store/client state and a different Console visual surface. Combining
both migrations would expand review and pixel scope. Deliver requester first,
then its independently useful workbench counterpart; preserve the parent plan ID.

## Decision

Extend existing session data-access/feature projects without a new core, project,
dependency or Redux slice. Data access owns one five-second whole invocation:
same-origin/no-store/no-redirect GET CSRF followed by one POST `/bff/logout`.
There is no automatic retry. Token/header validation precedes POST; CSRF is local
to that invocation. Only empty 204 acknowledges retirement. A recognized fixed-path
401 means sign-in is required, not a logout receipt. Other outcomes stay uncertain
or rejected; only closed safe values reach lifecycle state.

A private transport combines caller and session cancellation, rejects late headers
and permanently blocks new requests after retirement. Logout uses its separate
base transport. Every requester client, including notification refresh scopes,
receives the private transport. No provider token or browser storage is added.

Session feature owns confirmation, public status and one mounted exit lifecycle;
requester app owns outer layout, router/store composition and trusted tenant-only
sign-in links. Cancel preserves drafts and focus without I/O. Confirm unmounts the
complete private subtree. Route teardown aborts query/mutation handles and resets
caches after subscribers leave. A post-commit microtask retires transport before
logout, tolerating StrictMode replay without duplicate writes. The new public
heading takes focus during commit; the existing modal never restores retired focus.

Success or failure never remounts the old private router. Browser Back can change
the URL but cannot restore its drafts, caches or private requests. Explicit retry
starts fresh CSRF and only repeats local logout, never a business command. Only
acknowledged/recognized unauthenticated outcomes offer the app's trusted sign-in
link; failed/uncertain outcomes offer retry and explain closing the tab. No
return-to-work/cancel action exists after retirement.

This gate is document-local. Reloading starts a new document/backend check; after
uncertainty it can encounter an active session. Other tabs may retain old DOM and
must be closed separately. Provider sessions, accepted writes, ownership and
control leases keep their own lifecycles. No persistent retirement marker,
cross-tab coordination, global logout or compensation is introduced.

## Consequences

The requester gains usable sign-out on intake, case and notification surfaces,
with explicit unknown-outcome recovery and tested transport/cache retirement.
The existing store graph moves to an app-owned disposable factory; capability
dependencies and authority contracts remain unchanged. Session lifecycle state
is outside the private providers being destroyed and contains no resource data.

Deploy backend PR #228 first. Reverting this UI removes the controls, not durable
work. An old/unavailable backend never produces a false acknowledgement. Synthetic
guide/protocol/component tests do not certify live OIDC, cookie processing or
database authority. Compile/lint/format and focused tests run locally; heavy
browser, visual and recorded-guide gates run on CI.

## Alternatives considered

Resetting APIs while their subscribers remain mounted can restart retired reads.
Navigation alone leaves caches, drafts and pending callbacks alive. A logout
mutation inside the destroyed private provider has the wrong lifetime. Persisting
private recovery or a retirement marker changes retention and cross-tab policy.
The document gate and explicit teardown meet this slice without those contracts.
Workbench root/client retirement and its pixels belong to the next complete slice.
