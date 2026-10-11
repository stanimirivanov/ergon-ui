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
- Fresh-disclosure hooks that retire subscriptions, sequence pending exact-key
  reads before reopening, and expose only safe current read phases.
- Cause-free unexpected-defect containment before RTK can serialize or log a
  rejected client, invalid dependency binding, or malformed failure value.

The BFF independently checks current resolver authority and exact assignment.
Non-disclosing absence does not identify whether a run exists for another actor.
Both cache entries are evicted after their final reader leaves. The cache hooks
hide prior data during revalidation/failure and request a fresh read on reopening.
Cleanup only unsubscribes: pinned RTK's zero-grace eviction cancels a pending
request only after its last subscriber leaves, without aborting another reader.

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
the reducer/middleware. Direct client calls return expected failures and reject
unexpected defects rather than masquerading as transport errors. Every RTK
endpoint contains those rejections as `{ kind: 'unexpected-defect' }`, without
name, message, stack, response body, or cause; they never trigger automatic retry.

`normalizeRunSupervisionFailure` narrows framework errors to the closed safe
failure union, validates integer HTTP statuses in 100–599, and discards extra
fields. Unknown values become unexpected defects, not invalid server responses.
Only RTK's exact plain-object abort fingerprint becomes cancellation; a rejected
client is always a defect, including when its signal concurrently aborts. RTK
itself may win an abort race before the endpoint settles; late client failures
still cannot leak to cache, actions, or raw framework logs.

Console features consume `useAssignedRunDiscovery(query)` and
`useAssignedRunDisclosure(query | null)`. Their `AssignedRunRead<T>` exposes
`closed`, `pending`, `failed`, or `ready`; only `ready` includes the current
RTK-owned projection. `recheck()` closes this consumer's gate in the committed
render before I/O acquisition. Opening/rechecking waits for existing same-key
pending requests to settle, then forces a new request, so pre-close results
cannot authorize a reopened view. Another active subscriber may finish its
existing request; reopening waits without subscribing or aborting that reader.
StrictMode's abandoned effect acquires no request. Local hook state stores only
gate identity/generation, never a resource copy. Direct generated hooks remain
available for integrations that do not own private fresh-disclosure semantics.

Only the pinned Effect, Redux Toolkit, React, and React Redux dependencies are
needed. There is no client-owned application policy or separate model package.

## Verification

```powershell
pnpm nx lint @ergon/run-supervision-data-access-web
pnpm nx typecheck @ergon/run-supervision-data-access-web
pnpm nx test @ergon/run-supervision-data-access-web
```
