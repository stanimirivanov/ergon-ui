# Session web data access — transitional location

## Purpose

Own confidential-browser session execution and remote-cache integration until
the project moves to `packages/session/data-access-web`.

## Owns

- Same-origin session request construction and response decoding.
- Browser wire schemas and protocol-to-typed-failure translation.
- One bounded retry for classified transient read failures.
- Per-attempt timeouts and caller-cancellation normalization.
- Tenant-keyed RTK Query caching, request deduplication, and the generated
  current-actor React hook.

## Does not own

- Session model semantics or executable application policy.
- Redux store assembly or non-session cache integration.
- Sign-in navigation, routes, feature components, or presentation.
- OIDC credentials, provider tokens, or server-side session creation.

## Public API and dependencies

Consumers import only from `@ergon/infrastructure-session-web`. This
`type:data-access` package
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
