# Run supervision web data access

## Purpose

Own confidential-browser reads and remote-cache integration for resolution runs
assigned to the verified session actor. Assignment is not an exclusive control
lease; this package grants no authority.

## Owns

- Same-origin, no-store `GET /bff/v1/tenants/{tenantId}/resolution-runs/assigned`
  with a bounded limit and intact assignment keyset cursor.
- `GET /bff/v1/tenants/{tenantId}/resolution-runs/{runId}/console` for a recorded
  start/current-state snapshot, including retained terminal-state reads.
- Effect-based schema decoding, safe integer and identity validation, typed
  failures, per-attempt deadline, one transient retry, and caller cancellation.
- RTK Query cache identity, lifecycle, dependency binding, and generated hooks.

The BFF independently checks current resolver authority and exact assignment.
Non-disclosing absence does not identify whether a run exists for another actor.
Both cache entries are evicted after their final reader leaves. Features must
hide prior data during revalidation/failure and request a fresh read on reopening.

## Does not own

- Run assignment, control, approval, backend policy, or application workflows.
- Case evidence, a live trace, span measurements, or outcome-proof records.
- React feature presentation, routes, or store composition.
- Tokens, persistent browser storage, or private transport diagnostics.

## Public API and dependencies

Import `createRunSupervisionClient`, `runSupervisionApi`,
`RunSupervisionDependencies`, validated projections, queries, results, failures,
and generated hooks from `@ergon/run-supervision-data-access-web`. Composition
supplies `{ runSupervision: client }` as Redux thunk extra arguments and registers
the reducer/middleware. Expected failures are serializable values; unexpected
defects reject rather than masquerading as transport errors.

Only the pinned Effect, Redux Toolkit, React, and React Redux dependencies are
needed. There is no client-owned application policy or separate model package.

## Verification

```powershell
pnpm nx lint @ergon/run-supervision-data-access-web
pnpm nx typecheck @ergon/run-supervision-data-access-web
pnpm nx test @ergon/run-supervision-data-access-web
```
