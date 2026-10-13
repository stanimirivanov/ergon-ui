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
- Cohesive supervisor presence/inspection toolbar, discovery, execution and
  outcome sections. Explicit named pane slots preserve the complete layout
  across selection, pending, failed and successful reads.
- Explicit selected-run rechecks and recovery move focus to the persistent
  execution heading before their button is withdrawn; pending and failed reads keep that target
  while private records remain hidden.
- Discovery rechecks and read recovery use that same stable heading before
  disabling or withdrawing the initiating control. These explicit interaction
  callbacks add no focus effects tied to background discovery phases.
- Closing the exact-run gate during revalidation or failed discovery and on
  close/tenant switch. Request retirement and zero-grace eviction are owned by
  data access, not workspace rendering.
- Committed workflow/gate changes that hide private DOM before synchronous or
  held I/O. Immediate same-run reopening obtains a distinct check after older
  same-key requests settle; retiring one view never aborts another active reader.
- Distinguishing recorded terminal states from inspected outcome proof.
  A dedicated execution-record section renders the pinned capability's sanitized
  receipt, connector result, exact gateway-call latency and keyboard-inspectable
  measurement provenance. Missing projection, absent receipt, unmeasured timing
  and measured zero remain distinct; cost is explicitly not measured. Result,
  state projection and outcome proof never substitute for each other.
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
- App branding, global navigation, standard/focused shell, theme scope or
  viewport allocation. Presence can wrap without an assumed header height;
  panels never subtract fixed chrome dimensions from the viewport.
- Lease ownership, timers, handover, grants, approval decisions, steering,
  multi-step execution events, tool spans, billing, evidence claims, or proof.
  Their absence is explicit rather than filled with synthetic data.
- Shared domain-agnostic primitives or an interface-only application layer.

## Public API and dependencies

`AssignedRunWorkspace` accepts tenant request context, a trusted same-origin
sign-in URL, an opaque verified-actor presence slot, and the required app-owned
`WorkspaceRenderer`. Mount it beneath the application's verified-session boundary.
Presence display is not authority. All server state stays in RTK Query;
private selection and pagination intent stay in React state.

The renderer receives focused mode, `Assigned · read only` status, a
capability-owned toolbar and content together during render. The app supplies
branding, the page heading, Back to follow-ups navigation and outer placement;
no visibility callback mirrors the workflow. `ThreePaneLayout` from
`@ergon/ui-web` owns named leading/primary/trailing wrappers and responsive
allocation. The feature supplies their domain landmarks in that order and
keeps both execution and outcome placeholders present when detail is hidden.

`useAssignedRunWorkflow` is an implementation boundary, not another resource
cache or platform-neutral application core. It composes the cache-owned fresh
discovery/detail gates and keeps a selected terminal run as local intent when
active discovery no longer contains it. The workspace renders explicit typed
read phases and callbacks; it owns no promises, subscription aborts, transport
decoding or mirrored visibility. Presentation consumes those same typed gates
without introducing another request or focus owner.

Execution presentation derives directly from the currently disclosed RTK
projection. It stores no receipt copy, disclosure state or elapsed timer.
Exact decimal placement formats nanoseconds in milliseconds without floating-
point rounding. The native provenance disclosure performs no request and is
withdrawn with the rest of the private snapshot on recheck, failure or close.
Completion/start timestamps are observations, not duration inputs. This is one
winning receipt caller's gateway call, not total provider-operation latency or
aggregated retries. See [ADR 0028](../../../docs/decisions/0028-render-attributed-capability-execution.md).

The feature consumes `@ergon/run-supervision-data-access-web` through its
public API and `@ergon/ui-web` for reviewed primitives. Its Nx tags are
`type:feature`, `scope:run-supervision`, and `platform:web`.

## Verification

```powershell
pnpm nx lint @ergon/run-supervision-feature-web
pnpm nx typecheck @ergon/run-supervision-feature-web
pnpm nx test @ergon/run-supervision-feature-web
```
