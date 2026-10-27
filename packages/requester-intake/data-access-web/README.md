# Requester intake web data access

## Purpose and ownership

Own new-case command contracts, Kotlin-compatible input normalization, exact
normalized receipt validation, bounded same-origin Effect execution and the RTK
mutation. This capability precedes a current case resource; it does not import
requester-progress, session or resolver packages.

## Public contract and lifetime

Import from `@ergon/requester-intake-data-access-web`. `createIntakeBffClient`
obtains invocation-local CSRF and sends at most one POST within a default 5000ms
whole-invocation budget. No automatic retries or token/receipt caching. Validate
the original UUID, normalized input and UTC calendar timestamps before exposing
only acknowledgement identity. Cancellation cannot undo a write; defects may
reject the client but are contained before RTK logging/serialization.

`IntakeDependencies` supplies the executable port outside Redux state. The mounted
feature owns each abort/reset handle. `intakeApi` never populates progress/history.
Only the app supplies verified session context and trusted navigation. Goal and
observation retain raw immutable replay input while validation follows Kotlin
trimming and 500/8000 UTF-16 units; a supplementary character counts as two.

## Verification

```powershell
pnpm nx test @ergon/requester-intake-data-access-web
pnpm nx typecheck @ergon/requester-intake-data-access-web
pnpm nx lint @ergon/requester-intake-data-access-web
```
