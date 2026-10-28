# Notifications web feature

## TL;DR

`NotificationFeed` presents current checked historical metadata directly from RTK.
The host supplies fresh verified-session scope, trusted sign-in and recheck/open
callbacks. This feature never imports session or a target capability. See
[ADR 0055](../../../docs/decisions/0055-check-historical-notification-targets-independently.md).

## Presentation and lifetime

Pending and failed checks withdraw all retained rows. Checked empty, omitted older
history and denied/service/malformed/authentication failures have distinct wording.
Cards identify category, UTC delivery time and target reference, with composite
keys and accessible per-target buttons. Responsive grids wrap long identifiers.
Reading or opening a delivery does not mark it read or imply outstanding work.

The app focuses its persistent heading, retires requests/cache and creates a fresh
session/store lifetime before any recheck or target request. Target content belongs
to its own capability. No target metadata seeds a private cache or authorizes a
command. There are no forms, timers, browser persistence or animation.

## Verification

From the repository root:

```sh
pnpm nx lint @ergon/notifications-feature-web
pnpm nx typecheck @ergon/notifications-feature-web
pnpm nx test @ergon/notifications-feature-web
```

Focused tests check callbacks, failed/pending withdrawal and honest empty copy.
Both app route tests check fresh session before targets. Executable guide scenarios
cover keyboard focus, 320-pixel reflow, accessibility and failure recovery on CI.
