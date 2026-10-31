# Evaluation model

## TL;DR

Own platform-neutral immutable reports, artifact references and budget coherence for M07-PR13.

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

- `pnpm nx lint @ergon/evaluation-model`
- `pnpm nx typecheck @ergon/evaluation-model`
- `pnpm nx test @ergon/evaluation-model`

Run `pnpm verify` from the repository root for integration checks.

## Confirmed promotion (M07-PR14)

Promotion review, exact intent and acknowledgement now follow
[ADR 0061](../../../docs/decisions/0061-confirm-reviewed-contract-promotion.md).
Model owns neutral values, data access owns validated CSRF POSTs and ephemeral
mutations, and feature owns labelled input, acknowledgement and mounted recovery.
Cancel or navigation retires the private lifetime. No automatic promotion or
permission administration is introduced.
