# Follow-up model

## Purpose

Own the platform-neutral read models used to represent human follow-up work,
claims, and resolver-visible case context.

## Owns

- Inert historical requester questions and narrow recorded answers in bounded history,
  never delivery or proof. History distinguishes omitted answer coverage from null;
  immutable question-command receipts do not carry a response.
  Exact Unicode question validation is shared by the wire schema and RHF composer.

- Closed priority values, independent current revisions and inert historical
  assignment receipts; never queue ordering, risk, SLA or authority.

- Follow-up work-item and claim values.
- Inert terminal administrative-completion receipts, never case resolution.
- Inert historical direct-handover acknowledgements, distinct from current access.
- Inert internal note values and the pure exact-text Unicode refinement.
- Resolver-owned work projections and pure claim/work-item pairing refinement.
- Server-authorized case-summary projections and pure contract, version,
  evidence-order, retry-chain, and unassessed-proof refinements.

## Does not own

- HTTP payload schemas, URLs, status codes, retries, or CSRF state.
- Query and command gateway contracts.
- RTK Query caching, React state, routes, or presentation.

## Public API and dependencies

Consumers import only `@ergon/follow-up-model`. This `type:model` project has
no runtime dependencies and may not import frameworks, platform APIs,
data-access projects, or feature projects.

## Verification

```bash
pnpm nx lint @ergon/follow-up-model
pnpm nx typecheck @ergon/follow-up-model
pnpm nx test @ergon/follow-up-model
pnpm nx build @ergon/follow-up-model
```
