# Evaluation feature-web

## TL;DR

Own read-only history and exact-report React presentation with accessible text states for M07-PR13.

## Ownership and public API

The public `src/index.ts` exposes only this responsibility. See
[ADR 0060](../../../docs/decisions/0060-inspect-historical-evaluations.md) for
contracts, dependency direction and private disclosure lifetime. No promotion
mutation, fixture editing, authoring or live-provider execution lives here.

## Dependencies and verification

Model is platform neutral. Data access depends on model, Effect and RTK Query.
Feature depends on model, data access and shared web UI. Workbench supplies the
session-bound fetch, isolated store and navigation callbacks. No new external
dependency is introduced.

- `pnpm nx lint @ergon/evaluation-feature-web`
- `pnpm nx typecheck @ergon/evaluation-feature-web`
- `pnpm nx test @ergon/evaluation-feature-web`

Run `pnpm verify` from the repository root for integration checks.
