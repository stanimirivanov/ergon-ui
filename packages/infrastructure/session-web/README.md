# Session web infrastructure

## Purpose

Adapt the confidential browser BFF session resource to the current-actor
application port without allowing HTTP, Effect, retry, timeout, or wire-format
concerns into the inner layers.

## Owns

- Same-origin session request construction and response decoding.
- Browser wire schemas and protocol-to-application failure translation.
- One bounded retry for classified transient read failures.
- Per-attempt timeouts and caller-cancellation normalization.
- Tenant-keyed RTK Query caching, request deduplication, and the generated
  current-actor React hook.

## Does not own

- Session domain models or application contracts.
- Redux store assembly or non-session cache integration.
- Sign-in navigation, routes, feature components, or presentation.
- OIDC credentials, provider tokens, or server-side session creation.

## Public API and dependencies

Consumers import only from `@ergon/infrastructure-session-web`. The package
exposes `createCurrentActorBffAdapter`, `currentActorApi`,
`useCurrentActorQuery`, and the thunk-extra dependency contract required during
store composition. It implements `ResolveCurrentActor`, maps validated
responses to `CurrentActor`, and exposes neither Effect programs nor wire
payload types.

## Verification

```powershell
pnpm nx lint @ergon/infrastructure-session-web
pnpm nx typecheck @ergon/infrastructure-session-web
pnpm nx test @ergon/infrastructure-session-web
```
