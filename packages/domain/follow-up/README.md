# Follow-up model — transitional location

## Purpose

Own the platform-neutral read models used to represent human follow-up work,
claims, and resolver-visible case context until the project moves to
`packages/follow-up/model`.

## Owns

- Follow-up work-item and claim values.
- Resolver-owned work projections.
- Server-authorized case-summary projections and pure contract, version,
  evidence-order, and retry-handoff refinements.

## Does not own

- HTTP payload schemas, URLs, status codes, retries, or CSRF state.
- Query and command gateway contracts.
- RTK Query caching, React state, routes, or presentation.

## Public API and dependencies

Consumers import only `@ergon/domain-follow-up`. This `type:model` project has
no runtime dependencies and may not import frameworks, platform APIs,
data-access projects, or feature projects.

## Verification

```powershell
pnpm nx lint @ergon/domain-follow-up
pnpm nx typecheck @ergon/domain-follow-up
pnpm nx test @ergon/domain-follow-up
pnpm nx build @ergon/domain-follow-up
```
