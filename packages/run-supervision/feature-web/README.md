# Run-supervision web feature

## Purpose

Own the assigned-supervisor Resolver Console's React interaction and complete
responsive three-pane presentation. This is a server-authoritative read slice,
not a client application core or an execution-control surface.

## Owns

- A tenant-scoped workflow controller for local run selection, paired
  assignment-cursor traversal and heading-focus intent, with no run or case
  identity in URL or persistent storage.
- Assigned discovery, exact-run inspection, explicit recheck and recovery,
  accessible headings, status messages, policy disclosure, and narrow reflow.
- Closing the exact-run gate during revalidation or failed discovery and on
  close/tenant switch. Request retirement and zero-grace eviction are owned by
  data access, not workspace rendering.
- Committed workflow/gate changes that hide private DOM before synchronous or
  held I/O. Immediate same-run reopening obtains a distinct check after older
  same-key requests settle; retiring one view never aborts another active reader.
- Distinguishing recorded terminal states from inspected outcome proof.
  A selected terminal run may remain readable after leaving active discovery
  only while an exact assigned-run read still succeeds.
- Capability-specific failure copy and use of the app-composed sign-in URL.
  Cache errors are normalized by data access before the closed failure/recovery
  mapping selects sign-in, an explicit read retry, traversal reset, or no action.
  Reset starts a fresh first-page read and discards selection and cursor history,
  including when the rejected request was already for the first page.
  Unexpected defects are distinct from malformed responses and never trigger an
  automatic retry.

## Does not own

- Protocol decoding, Effect execution, cache policy, authentication, authority,
  tenant routing, store assembly, or supervisor assignment.
- Lease ownership, timers, handover, grants, approval decisions, steering,
  execution events, tool spans, measurements, evidence claims, or proof.
  Their absence is explicit rather than filled with synthetic data.
- Shared domain-agnostic primitives or an interface-only application layer.

## Public API and dependencies

`AssignedRunWorkspace` accepts tenant request context, a trusted same-origin
sign-in URL, an opaque verified-actor presence slot, and an optional return
callback. Mount it beneath the application's verified-session boundary.
Presence display is not authority. All server state stays in RTK Query;
private selection and pagination intent stay in React state.

`useAssignedRunWorkflow` is an implementation boundary, not another resource
cache or platform-neutral application core. It composes the cache-owned fresh
discovery/detail gates and keeps a selected terminal run as local intent when
active discovery no longer contains it. The workspace renders explicit typed
read phases and callbacks; it owns no promises, subscription aborts, transport
decoding or mirrored visibility. Pane/shell extraction is a later planned slice.

The feature consumes `@ergon/run-supervision-data-access-web` through its
public API and `@ergon/ui-web` for reviewed primitives. Its Nx tags are
`type:feature`, `scope:run-supervision`, and `platform:web`.

## Verification

```powershell
pnpm nx lint @ergon/run-supervision-feature-web
pnpm nx typecheck @ergon/run-supervision-feature-web
pnpm nx test @ergon/run-supervision-feature-web
```
