# ADR 0057: Retire the workbench private session on sign-out

- Status: Accepted
- Date: 2026-10-28
- Milestone: M03 - Policy and Human Authority

## TL;DR

M05-PR28b consumes ADR 0056's shared exit lifecycle in workbench. Remove module
singletons, bind every private client to the session transport, and dispose all
route resources before logout. Shared follow-up CSRF gains explicit retirement.

## Context

Requester PR #231 and backend PR #228 are merged. Workbench previously constructed
its store and dependency graph at module evaluation, retaining follow-up CSRF
across route departure. Notifications had disposable stores but used base fetch.
Navigating away or resetting one cache cannot retire all private state or keep an
uncertain logout from reopening it. Console control is a separate server lifecycle.

## Decision

The app composes LocalSessionBoundary above RouterProvider, as requester does.
WorkbenchFrame exposes the existing confirmation in standard and focused chrome,
including notification routes. The app supplies public exit placement and a
canonical tenant-only login target, discarding private query/fragment/selection.
The public home route remains public; no fake authenticated status is inferred.

Create the workbench dependency/store graph inside its mounted route. Every
session, follow-up, question and run-supervision client receives the private
transport; notification creation and replacement do too. Keep dependencies in
thunk extra arguments, not serializable state. Route teardown defers disposal
through StrictMode replay, unsubscribes first, aborts all running queries and
mutations, then resets the three registered RTK APIs. Injected endpoints share
those owners, including notes, questions, admission history and control commands.
Notification scopes retain their existing independent teardown.

Follow-up data access owns a permanent retire operation: drop the synchronized
CSRF reference and interrupt active mutation execution. Retired methods return
typed cancellation without acquiring new CSRF or sending POST. The root transport
independently interrupts all private HTTP and rejects late headers. Logout uses
the separate base transport, fresh invocation-local CSRF and no automatic retry.

Whole-tree withdrawal also unmounts private forms, inspectors, replay intent and
timers. Existing command hooks retire callbacks on cleanup; store and transport
retirement cover pending observation even where a hook reset has already removed
its mutation cache entry. A late acknowledgement cannot remount private children
or start a successor action. Sign-out sends no business command, lease release,
renewal, handover or compensation. Accepted work and server leases can survive it.

ADR 0056's outcome and document boundaries remain: uncertain results stay closed,
explicit retry checks only local logout, Back cannot restore the private router,
reload starts new backend checks, other tabs require separate closure, and an
identity-provider session may remain. No browser storage or cross-tab protocol.

## Consequences

No new package, dependency, application core or Redux slice. Both apps now consume
the same existing session contracts. Workbench route departure also retires its
graph instead of retaining module-level caches; a later route visit starts fresh.
This is a deliberate behavior change with no wire/schema migration.

The global button intentionally changes Console pixels. Existing pinned-renderer
comparisons must be reviewed and their changed baseline images approved; neither
masks nor tolerances nor automatic CI baseline acceptance are allowed. Under the
requested busy-host workflow, heavy browser, visual and recorded-guide checks run
on CI. A draft remains pending that evidence and artifact review. Synthetic tests
cannot certify live OIDC, cookie processing, database authority or server rollback.

## Alternatives considered

Keeping module singletons and merely hiding the DOM leaves a longer-lived cache
and CSRF owner. Resetting APIs with mounted subscribers can restart private reads.
Moving logout into a private RTK mutation gives it the lifetime being destroyed.
Automatically releasing a lease couples distinct authorized operations and makes
unknown-outcome recovery unsafe. The existing document gate and explicit resource
disposal satisfy this slice without a generic registry or lifecycle framework.
