# Session web data access

## Purpose

Own confidential-browser session execution and remote-cache integration.

## Owns

- Same-origin session request construction and response decoding.
- Browser wire schemas and protocol-to-typed-failure translation.
- The `CurrentActorClient`, typed result, and presentation-safe failure
  contracts consumed by its RTK Query cache and composition root.
- One bounded retry for classified transient read failures.
- Per-attempt timeouts and caller-cancellation normalization.
- Tenant-keyed RTK Query caching, request deduplication, and the generated
  current-actor React hook.
- Diagnostic-free containment of missing bindings and client defects before
  RTK logging/serialization; closed failure normalization with validated status.

## Does not own

- Session model semantics or executable application policy.
- Redux store assembly or non-session cache integration.
- Sign-in navigation, routes, feature components, or presentation.
- OIDC credentials, provider tokens, or server-side session creation.

## Public API and dependencies

Consumers import only from `@ergon/session-data-access-web`. This
`type:data-access` package exposes `createCurrentActorBffAdapter`,
`CurrentActorClient`, the presentation-safe result and failure types,
`currentActorApi`, `useCurrentActorQuery`, and the thunk-extra dependency
contract required during store composition. It maps validated responses to the
session model's `CurrentActor` and exposes neither Effect programs nor wire
payload types.
Direct clients may still reject unexpected defects; cache callers receive
`unexpected-defect` instead. `normalizeCurrentActorFailure` exposes only safe
failure fields and does not mislabel unknown errors as invalid responses.

## Verification

```powershell
pnpm nx lint @ergon/session-data-access-web
pnpm nx typecheck @ergon/session-data-access-web
pnpm nx test @ergon/session-data-access-web
```
