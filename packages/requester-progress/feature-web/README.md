# Requester progress web feature

## Purpose and ownership

Render one verified requester's narrow case projection, neutral unavailable
states and an explicit recheck. `RequesterCaseProgress` receives validated
coordinates and an app-built same-origin sign-in link. It consumes the public
requester-progress data-access API and ui-web primitives; it cannot import
session/resolver capabilities or a deployable app.

The parent owns shell/landmarks and outer placement. This feature owns the case
card and failure wording, local recheck intent, persistent heading focus and
plain-text content. A recheck commits an attempt before data-access acquisition,
hiding the previous goal/timestamps before I/O. It never copies a remote resource.
OPEN is not run progress; VERIFIED_RESOLVED is an observed accepted case state,
not browser proof acceptance.

## Exclusions

No intake, discovery, information forms, proof details, resolver commands, polling,
local persistence or client-owned application core. Complete adaptive canvas
presentation is M05-PR18.

## Verification

```powershell
pnpm nx test @ergon/requester-progress-feature-web
pnpm nx typecheck @ergon/requester-progress-feature-web
pnpm nx lint @ergon/requester-progress-feature-web
```
