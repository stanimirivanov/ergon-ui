# Session web feature

## Purpose

`LocalSessionBoundary`, `LocalSignOutControl` and `LocalSignOutStatus` own a
document-local exit lifecycle outside private Redux providers. Cancel retains
the workspace; confirm withdraws it before bounded logout. Failure never restores
private content; retry is explicit and only acknowledged/recognized absent-session
results offer trusted app-supplied login. The app owns outer placement and cache
teardown; every private client uses `usePrivateSessionFetch`. See
[ADR 0056](../../../docs/decisions/0056-retire-requester-private-state-on-local-sign-out.md).

Own both apps' fail-closed session verification states and verified-actor
presentation without importing the deployable workbench or follow-up feature.

## Owns

- Tenant-address validation before the current-actor request.
- Loading, verified, authentication, identity, transient-failure, and retry UI.
- The guarantee that app-supplied authenticated content mounts only after the
  BFF returns a verified actor.
- Pending or failed revalidation outranks retained actor data. Workbench defects
  stay distinct from unusable identity responses and offer operator guidance,
  not an automatic retry or private diagnostics.
- Plain-text presentation of the verified actor's public identity projection.

## Does not own

- Route hierarchy, sign-in URL construction, app shell, or Redux store.
- Follow-up workspace presentation or other tenant-scoped resources.
- BFF protocol decoding, authentication authority, or RTK Query cache policy.
- Provider credentials or browser storage.

## Public API and dependencies

Consumers import `CurrentActorBoundary`, `VerifiedActorDetails`, and
`VerifiedActorBadge` from
`@ergon/session-feature-web`. The app supplies its shell, trusted same-origin
sign-in URL builder, and authenticated content renderer. This `type:feature`
project consumes the current-actor cache hook from
`@ergon/session-data-access-web`, the actor model from
`@ergon/session-model`, and the web button primitive from `@ergon/ui-web`.
The tenant route value is navigation context, never authorization evidence.
`renderFrame` wraps only invalid, pending and failed session states.
`renderVerified` supplies the complete verified workspace, including its app-owned
shell. This prevents nested landmarks while leaving the fail-closed gate intact.
The compact badge displays only the verified actor ID and provider; it does not
represent current claim ownership or a lease.

## Verification

```powershell
pnpm nx lint @ergon/session-feature-web
pnpm nx typecheck @ergon/session-feature-web
pnpm nx test @ergon/session-feature-web
```
