# Follow-up domain

## Purpose

Own the platform-neutral read models and invariants used to represent human
follow-up work, claims, and resolver-visible case context.

## Owns

- Follow-up work-item and claim values.
- Resolver-owned work projections.
- Server-authorized case-summary projections.

## Does not own

- HTTP payload schemas, URLs, status codes, retries, or CSRF state.
- Query and command ports.
- RTK Query caching, React state, routes, or presentation.

## Public API and dependencies

Consumers import only `@ergon/follow-up-domain`. This package has no runtime
dependencies and may not import frameworks, platform APIs, or infrastructure.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-domain
pnpm nx typecheck @ergon/follow-up-domain
pnpm nx build @ergon/follow-up-domain
```
