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

Consumers import only `@ergon/domain-follow-up`. This package has no runtime
dependencies and may not import frameworks, platform APIs, or infrastructure.

## Verification

```powershell
pnpm nx lint @ergon/domain-follow-up
pnpm nx typecheck @ergon/domain-follow-up
pnpm nx build @ergon/domain-follow-up
```
