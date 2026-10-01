# Follow-up model

## Purpose

Own the platform-neutral read models used to represent human follow-up work,
claims, and resolver-visible case context.

## Owns

- Follow-up work-item and claim values.
- Resolver-owned work projections and pure claim/work-item pairing refinement.
- Server-authorized case-summary projections and pure contract, version,
  evidence-order, and retry-handoff refinements.

## Does not own

- HTTP payload schemas, URLs, status codes, retries, or CSRF state.
- Query and command gateway contracts.
- RTK Query caching, React state, routes, or presentation.

## Public API and dependencies

Consumers import only `@ergon/follow-up-model`. This `type:model` project has
no runtime dependencies and may not import frameworks, platform APIs,
data-access projects, or feature projects.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-model
pnpm nx typecheck @ergon/follow-up-model
pnpm nx test @ergon/follow-up-model
pnpm nx build @ergon/follow-up-model
```
