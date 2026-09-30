# Session web feature

## Purpose

Own the browser's fail-closed session verification states and verified-actor
presentation without importing the deployable workbench or follow-up feature.

## Owns

- Tenant-address validation before the current-actor request.
- Loading, verified, authentication, identity, transient-failure, and retry UI.
- The guarantee that app-supplied authenticated content mounts only after the
  BFF returns a verified actor.
- Plain-text presentation of the verified actor's public identity projection.

## Does not own

- Route hierarchy, sign-in URL construction, workbench shell, or Redux store.
- Follow-up workspace presentation or other tenant-scoped resources.
- BFF protocol decoding, authentication authority, or RTK Query cache policy.
- Provider credentials or browser storage.

## Public API and dependencies

Consumers import `CurrentActorBoundary` and `VerifiedActorDetails` from
`@ergon/session-feature-web`. The app supplies its shell, trusted same-origin
sign-in URL builder, and authenticated content renderer. This `type:feature`
project consumes the current-actor cache hook from
`@ergon/infrastructure-session-web`, the actor model from
`@ergon/domain-session`, and the web button primitive from `@ergon/ui-web`.
The tenant route value is navigation context, never authorization evidence.

## Verification

```powershell
pnpm nx lint @ergon/session-feature-web
pnpm nx typecheck @ergon/session-feature-web
pnpm nx test @ergon/session-feature-web
```
