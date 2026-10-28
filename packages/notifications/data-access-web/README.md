# Notifications web data access

## TL;DR

Bounded historical metadata for the current deployment audience. This package
owns Effect/HTTP validation and RTK cache admission, never session verification,
navigation, current ownership or target data. See
[ADR 0055](../../../docs/decisions/0055-check-historical-notification-targets-independently.md).

## Contract and ownership

`createNotificationClient` reads the fixed tenant notifications endpoint with
same-origin credentials, no-store and one five-second budget including JSON.
There is no automatic retry. Host-owned AbortSignals retire work; transport,
timeout, authentication, denial, malformed data and service failures are closed
safe values. RTK contains unexpected defects and strips unsolicited fields.

The app verifies session and injects the client outside Redux. Query actor and
audience identify a memory cache, never HTTP authority. Recheck/open/route departure
must retire handles and the whole scope; zero unused-cache grace is not cancellation.
Rows enforce audience/target coherence, max50, exact truncation, composite identity
and descending nanosecond/backend tie order. No unread/read writes or persistence.

## Verification

From the repository root:

```sh
pnpm nx lint @ergon/notifications-data-access-web
pnpm nx typecheck @ergon/notifications-data-access-web
pnpm nx test @ergon/notifications-data-access-web
```

Tests cover malformed protocol, identity, precise order, cancellation/body timeout,
safe cache failures and fixed request coordinates. Browser/live authorization are
separate gates; synthetic responses do not prove backend enforcement.
